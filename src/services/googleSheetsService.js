const BASE_SPREADSHEET_NAME = import.meta.env.VITE_SPREADSHEET_NAME || 'ExpenseTracker';
const CONFIG_SPREADSHEET_NAME = `${BASE_SPREADSHEET_NAME}_Config`;

class GoogleSheetsService {
  constructor(accessToken, onTokenExpired = null) {
    this.accessToken = accessToken;
    this.onTokenExpired = onTokenExpired;

    // Multi-spreadsheet management
    this.configSpreadsheetId = null;
    this.yearSpreadsheetIds = {}; // { '2024': 'id', '2025': 'id' }
    this.currentYear = new Date().getFullYear();

    // Load from localStorage if available
    this.loadFromLocalStorage();
  }

  // Load spreadsheet IDs from localStorage
  loadFromLocalStorage() {
    try {
      const configId = localStorage.getItem('configSpreadsheetId');
      if (configId) {
        this.configSpreadsheetId = configId;
      }

      const yearIdsJson = localStorage.getItem('yearSpreadsheetIds');
      if (yearIdsJson) {
        this.yearSpreadsheetIds = JSON.parse(yearIdsJson);
      }

      const savedYear = localStorage.getItem('currentYear');
      if (savedYear) {
        this.currentYear = parseInt(savedYear, 10);
      }
    } catch (error) {
      console.error('Error loading from localStorage:', error);
    }
  }

  // Save spreadsheet IDs to localStorage
  saveToLocalStorage() {
    try {
      if (this.configSpreadsheetId) {
        localStorage.setItem('configSpreadsheetId', this.configSpreadsheetId);
      }
      localStorage.setItem('yearSpreadsheetIds', JSON.stringify(this.yearSpreadsheetIds));
      localStorage.setItem('currentYear', this.currentYear.toString());
    } catch (error) {
      console.error('Error saving to localStorage:', error);
    }
  }

  // Helper method to check for 401 errors and handle token expiration
  async handleResponse(response) {
    if (response.status === 401) {
      console.error('Access token expired or invalid (401 Unauthorized)');
      if (this.onTokenExpired) {
        this.onTokenExpired();
      }
      throw new Error('Authentication expired. Please login again.');
    }
    return response;
  }

  // Set the active year for data operations
  setActiveYear(year) {
    this.currentYear = year;
    localStorage.setItem('currentYear', year.toString());
  }

  // Get the spreadsheet name for a specific year
  getYearSpreadsheetName(year) {
    return `${BASE_SPREADSHEET_NAME}_${year}`;
  }

  // Find or create the config spreadsheet (for categories)
  async findOrCreateConfigSpreadsheet() {
    try {
      // Check if we already have the ID
      if (this.configSpreadsheetId) {
        return this.configSpreadsheetId;
      }

      // Search for existing config spreadsheet
      const searchResponse = await fetch(
        `https://www.googleapis.com/drive/v3/files?q=name='${CONFIG_SPREADSHEET_NAME}' and mimeType='application/vnd.google-apps.spreadsheet' and trashed=false`,
        {
          headers: { Authorization: `Bearer ${this.accessToken}` },
        }
      );

      await this.handleResponse(searchResponse);
      const searchData = await searchResponse.json();

      if (searchData.files && searchData.files.length > 0) {
        this.configSpreadsheetId = searchData.files[0].id;
        this.saveToLocalStorage();

        // Check if headers exist
        const needsInit = await this.checkConfigNeedsInitialization();
        if (needsInit) {
          console.log('Config spreadsheet found but missing headers, initializing...');
          await this.initializeConfigSpreadsheet();
        }

        return this.configSpreadsheetId;
      }

      // Create new config spreadsheet
      const createResponse = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          properties: { title: CONFIG_SPREADSHEET_NAME },
          sheets: [{ properties: { title: 'Categories' } }],
        }),
      });

      await this.handleResponse(createResponse);
      const createData = await createResponse.json();
      this.configSpreadsheetId = createData.spreadsheetId;
      this.saveToLocalStorage();

      // Initialize headers and add default categories
      await this.initializeConfigSpreadsheet();

      return this.configSpreadsheetId;
    } catch (error) {
      console.error('Error finding/creating config spreadsheet:', error);
      throw error;
    }
  }

  // Check if config spreadsheet needs initialization
  async checkConfigNeedsInitialization() {
    try {
      const response = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${this.configSpreadsheetId}/values/Categories!A1:B1`,
        {
          headers: { Authorization: `Bearer ${this.accessToken}` },
        }
      );

      await this.handleResponse(response);
      const data = await response.json();

      if (!data.values || data.values.length === 0 || data.values[0].length === 0) {
        return true;
      }

      return data.values[0][0] !== 'Category';
    } catch (error) {
      console.error('Error checking config initialization:', error);
      return true;
    }
  }

  // Initialize config spreadsheet with headers and default categories
  async initializeConfigSpreadsheet() {
    try {
      // Get sheet metadata
      const metadataResponse = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${this.configSpreadsheetId}`,
        {
          headers: { Authorization: `Bearer ${this.accessToken}` },
        }
      );
      await this.handleResponse(metadataResponse);
      const metadata = await metadataResponse.json();

      const categoriesSheet = metadata.sheets.find(s => s.properties.title === 'Categories');
      const sheetId = categoriesSheet.properties.sheetId;

      // Add headers
      const headerResponse = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${this.configSpreadsheetId}:batchUpdate`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            requests: [{
              updateCells: {
                range: { sheetId: sheetId, startRowIndex: 0, endRowIndex: 1 },
                rows: [{
                  values: [
                    { userEnteredValue: { stringValue: 'Category' } },
                    { userEnteredValue: { stringValue: 'Color' } },
                  ],
                }],
                fields: 'userEnteredValue',
              },
            }],
          }),
        }
      );
      await this.handleResponse(headerResponse);

      // Add default categories
      await this.addDefaultCategories();
    } catch (error) {
      console.error('Error initializing config spreadsheet:', error);
      throw error;
    }
  }

  // Add default categories to config spreadsheet
  async addDefaultCategories() {
    try {
      // Check if categories already exist
      const response = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${this.configSpreadsheetId}/values/Categories!A2:B2`,
        {
          headers: { Authorization: `Bearer ${this.accessToken}` },
        }
      );

      await this.handleResponse(response);
      const data = await response.json();

      if (data.values && data.values.length > 0) {
        console.log('Categories already exist, skipping defaults');
        return;
      }

      console.log('Adding default categories');
      const defaultCategories = [
        ['Food & Dining', '#FF6384'],
        ['Transportation', '#36A2EB'],
        ['Shopping', '#FFCE56'],
        ['Entertainment', '#4BC0C0'],
        ['Bills & Utilities', '#9966FF'],
        ['Healthcare', '#FF9F40'],
        ['Education', '#FF6384'],
        ['Other', '#C9CBCF'],
      ];

      const appendResponse = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${this.configSpreadsheetId}/values/Categories!A:A:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ values: defaultCategories }),
        }
      );

      await this.handleResponse(appendResponse);
    } catch (error) {
      console.error('Error adding default categories:', error);
    }
  }

  // Find or create a year-specific spreadsheet
  async findOrCreateYearSpreadsheet(year = this.currentYear) {
    try {
      // Check if we already have the ID for this year
      if (this.yearSpreadsheetIds[year]) {
        return this.yearSpreadsheetIds[year];
      }

      const spreadsheetName = this.getYearSpreadsheetName(year);

      // Search for existing year spreadsheet
      const searchResponse = await fetch(
        `https://www.googleapis.com/drive/v3/files?q=name='${spreadsheetName}' and mimeType='application/vnd.google-apps.spreadsheet' and trashed=false`,
        {
          headers: { Authorization: `Bearer ${this.accessToken}` },
        }
      );

      await this.handleResponse(searchResponse);
      const searchData = await searchResponse.json();

      if (searchData.files && searchData.files.length > 0) {
        this.yearSpreadsheetIds[year] = searchData.files[0].id;
        this.saveToLocalStorage();

        // Check if headers exist
        const needsInit = await this.checkYearNeedsInitialization(year);
        if (needsInit) {
          console.log(`Year spreadsheet ${year} found but missing headers, initializing...`);
          await this.initializeYearSpreadsheet(year);
        }

        return this.yearSpreadsheetIds[year];
      }

      // Create new year spreadsheet
      const createResponse = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          properties: { title: spreadsheetName },
          sheets: [
            { properties: { title: 'Expenses' } },
            { properties: { title: 'Income' } },
            { properties: { title: 'Budgets' } },
            { properties: { title: 'RecurringExpenses' } },
          ],
        }),
      });

      await this.handleResponse(createResponse);
      const createData = await createResponse.json();
      this.yearSpreadsheetIds[year] = createData.spreadsheetId;
      this.saveToLocalStorage();

      // Initialize headers
      await this.initializeYearSpreadsheet(year);

      return this.yearSpreadsheetIds[year];
    } catch (error) {
      console.error(`Error finding/creating year spreadsheet for ${year}:`, error);
      throw error;
    }
  }

  // Check if year spreadsheet needs initialization
  async checkYearNeedsInitialization(year) {
    try {
      const spreadsheetId = this.yearSpreadsheetIds[year];
      const response = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Expenses!A1:G1`,
        {
          headers: { Authorization: `Bearer ${this.accessToken}` },
        }
      );

      await this.handleResponse(response);
      const data = await response.json();

      if (!data.values || data.values.length === 0 || data.values[0].length === 0) {
        return true;
      }

      return data.values[0][0] !== 'ID';
    } catch (error) {
      console.error('Error checking year initialization:', error);
      return true;
    }
  }

  // Initialize year spreadsheet with headers
  async initializeYearSpreadsheet(year) {
    try {
      const spreadsheetId = this.yearSpreadsheetIds[year];

      // Get sheet metadata
      const metadataResponse = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}`,
        {
          headers: { Authorization: `Bearer ${this.accessToken}` },
        }
      );
      await this.handleResponse(metadataResponse);
      const metadata = await metadataResponse.json();

      // Create sheet ID map
      const sheetMap = {};
      metadata.sheets.forEach(sheet => {
        sheetMap[sheet.properties.title] = sheet.properties.sheetId;
      });

      // Initialize headers for all sheets
      const requests = [
        // Expenses headers
        {
          updateCells: {
            range: { sheetId: sheetMap['Expenses'], startRowIndex: 0, endRowIndex: 1 },
            rows: [{
              values: [
                { userEnteredValue: { stringValue: 'ID' } },
                { userEnteredValue: { stringValue: 'Date' } },
                { userEnteredValue: { stringValue: 'Amount' } },
                { userEnteredValue: { stringValue: 'Category' } },
                { userEnteredValue: { stringValue: 'Description' } },
                { userEnteredValue: { stringValue: 'IsRecurring' } },
                { userEnteredValue: { stringValue: 'RecurringId' } },
              ],
            }],
            fields: 'userEnteredValue',
          },
        },
        // Income headers
        {
          updateCells: {
            range: { sheetId: sheetMap['Income'], startRowIndex: 0, endRowIndex: 1 },
            rows: [{
              values: [
                { userEnteredValue: { stringValue: 'ID' } },
                { userEnteredValue: { stringValue: 'Date' } },
                { userEnteredValue: { stringValue: 'Amount' } },
                { userEnteredValue: { stringValue: 'Source' } },
                { userEnteredValue: { stringValue: 'Description' } },
              ],
            }],
            fields: 'userEnteredValue',
          },
        },
        // Budgets headers (Category | Jan | Feb | Mar | ... | Dec)
        {
          updateCells: {
            range: { sheetId: sheetMap['Budgets'], startRowIndex: 0, endRowIndex: 1 },
            rows: [{
              values: [
                { userEnteredValue: { stringValue: 'Category' } },
                { userEnteredValue: { stringValue: 'Jan' } },
                { userEnteredValue: { stringValue: 'Feb' } },
                { userEnteredValue: { stringValue: 'Mar' } },
                { userEnteredValue: { stringValue: 'Apr' } },
                { userEnteredValue: { stringValue: 'May' } },
                { userEnteredValue: { stringValue: 'Jun' } },
                { userEnteredValue: { stringValue: 'Jul' } },
                { userEnteredValue: { stringValue: 'Aug' } },
                { userEnteredValue: { stringValue: 'Sep' } },
                { userEnteredValue: { stringValue: 'Oct' } },
                { userEnteredValue: { stringValue: 'Nov' } },
                { userEnteredValue: { stringValue: 'Dec' } },
              ],
            }],
            fields: 'userEnteredValue',
          },
        },
        // RecurringExpenses headers
        {
          updateCells: {
            range: { sheetId: sheetMap['RecurringExpenses'], startRowIndex: 0, endRowIndex: 1 },
            rows: [{
              values: [
                { userEnteredValue: { stringValue: 'ID' } },
                { userEnteredValue: { stringValue: 'Amount' } },
                { userEnteredValue: { stringValue: 'Category' } },
                { userEnteredValue: { stringValue: 'Description' } },
                { userEnteredValue: { stringValue: 'Frequency' } },
                { userEnteredValue: { stringValue: 'StartDate' } },
                { userEnteredValue: { stringValue: 'IsActive' } },
              ],
            }],
            fields: 'userEnteredValue',
          },
        },
      ];

      const response = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ requests }),
        }
      );
      await this.handleResponse(response);

      console.log(`Year spreadsheet ${year} initialized successfully`);
    } catch (error) {
      console.error(`Error initializing year spreadsheet for ${year}:`, error);
      throw error;
    }
  }

  // Discover all available years (by searching for year spreadsheets)
  async discoverAvailableYears() {
    try {
      const searchResponse = await fetch(
        `https://www.googleapis.com/drive/v3/files?q=name contains '${BASE_SPREADSHEET_NAME}_' and mimeType='application/vnd.google-apps.spreadsheet' and trashed=false`,
        {
          headers: { Authorization: `Bearer ${this.accessToken}` },
        }
      );

      await this.handleResponse(searchResponse);
      const searchData = await searchResponse.json();

      const years = [];
      if (searchData.files) {
        for (const file of searchData.files) {
          // Extract year from name (e.g., "ExpenseTracker_2024" -> 2024)
          const match = file.name.match(/_(\d{4})$/);
          if (match) {
            const year = parseInt(match[1], 10);
            years.push(year);
            this.yearSpreadsheetIds[year] = file.id;
          }
        }
      }

      this.saveToLocalStorage();
      return years.sort((a, b) => b - a); // Sort descending (most recent first)
    } catch (error) {
      console.error('Error discovering available years:', error);
      return [];
    }
  }

  // CRUD Methods - now route to correct spreadsheet based on year

  async appendRows(sheetName, rows, year = this.currentYear) {
    const spreadsheetId = sheetName === 'Categories'
      ? await this.findOrCreateConfigSpreadsheet()
      : await this.findOrCreateYearSpreadsheet(year);

    const response = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${sheetName}!A:A:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ values: rows }),
      }
    );

    await this.handleResponse(response);
    return response.json();
  }

  async getRows(sheetName, range = '', year = this.currentYear) {
    const spreadsheetId = sheetName === 'Categories'
      ? await this.findOrCreateConfigSpreadsheet()
      : await this.findOrCreateYearSpreadsheet(year);

    const fullRange = range ? `${sheetName}!${range}` : sheetName;
    const response = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${fullRange}`,
      {
        headers: { Authorization: `Bearer ${this.accessToken}` },
      }
    );

    await this.handleResponse(response);
    const data = await response.json();
    return data.values || [];
  }

  async updateRow(sheetName, range, values, year = this.currentYear) {
    const spreadsheetId = sheetName === 'Categories'
      ? await this.findOrCreateConfigSpreadsheet()
      : await this.findOrCreateYearSpreadsheet(year);

    const response = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${sheetName}!${range}?valueInputOption=USER_ENTERED`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ values: [values] }),
      }
    );

    await this.handleResponse(response);
    return response.json();
  }

  async deleteRow(sheetName, rowIndex, year = this.currentYear) {
    const spreadsheetId = sheetName === 'Categories'
      ? await this.findOrCreateConfigSpreadsheet()
      : await this.findOrCreateYearSpreadsheet(year);

    // Get sheet ID
    const sheetResponse = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}`,
      {
        headers: { Authorization: `Bearer ${this.accessToken}` },
      }
    );

    await this.handleResponse(sheetResponse);
    const sheetData = await sheetResponse.json();
    const sheet = sheetData.sheets.find((s) => s.properties.title === sheetName);
    const sheetId = sheet.properties.sheetId;

    const response = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requests: [{
            deleteDimension: {
              range: {
                sheetId: sheetId,
                dimension: 'ROWS',
                startIndex: rowIndex,
                endIndex: rowIndex + 1,
              },
            },
          }],
        }),
      }
    );

    await this.handleResponse(response);
    return response.json();
  }

  // Special method for updating budget for a specific month
  async updateBudgetForMonth(category, month, amount, year = this.currentYear) {
    await this.findOrCreateYearSpreadsheet(year);

    // Get all budget data
    const budgetData = await this.getRows('Budgets', '', year);

    if (budgetData.length === 0) {
      throw new Error('Budgets sheet is empty');
    }

    // Find the row for this category
    const categoryRowIndex = budgetData.findIndex((row, index) => index > 0 && row[0] === category);

    if (categoryRowIndex === -1) {
      // Category doesn't exist in budgets, add new row
      const newRow = [category, ...Array(12).fill(0)];
      newRow[month] = amount; // month is 1-12, but array is 0-indexed after category
      await this.appendRows('Budgets', [newRow], year);
    } else {
      // Update existing row
      // Column is B + (month - 1) for month 1-12
      const column = String.fromCharCode(66 + (month - 1)); // B=Jan, C=Feb, etc.
      const rowNumber = categoryRowIndex + 1; // Convert to 1-based index
      const range = `${column}${rowNumber}`;

      await this.updateRow('Budgets', range, [amount], year);
    }
  }

  // Get current year's spreadsheet ID (for UI display/linking)
  getCurrentYearSpreadsheetId() {
    return this.yearSpreadsheetIds[this.currentYear] || null;
  }
}

export default GoogleSheetsService;
