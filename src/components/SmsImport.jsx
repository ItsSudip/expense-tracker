import { useState } from 'react';
import { useData } from '../contexts/DataContext';
import {
  Modal, Button, List, InputNumber, Select, DatePicker, Input, message, Empty, Tag, Alert, Spin,
} from 'antd';
import { ScanOutlined, CheckOutlined, DeleteOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import {
  scanForDrafts, ensurePermission, markImported, isSmsAvailable,
} from '../services/smsImport';

/**
 * "Import from SMS" flow. Scans the inbox for transaction messages since the
 * last import, parses them into editable drafts, and saves the ones the user
 * approves. Confirm-before-save: nothing is written until the user approves.
 */
// Preset lookback ranges offered before scanning.
const RANGE_PRESETS = [
  { label: 'Last 1 day', value: 1 },
  { label: 'Last 3 days', value: 3 },
  { label: 'Last 7 days', value: 7 },
  { label: 'Last 20 days', value: 20 },
  { label: 'Custom…', value: 'custom' },
];

const SmsImport = ({ onClose }) => {
  const { categories, addExpense } = useData();
  const [drafts, setDrafts] = useState(null); // null = not scanned yet
  const [scanning, setScanning] = useState(false);
  const [savingId, setSavingId] = useState(null);
  const [permDenied, setPermDenied] = useState(false);
  const [rangePreset, setRangePreset] = useState(7);      // days, or 'custom'
  const [customDays, setCustomDays] = useState(10);

  const lookbackDays = rangePreset === 'custom' ? (customDays || 1) : rangePreset;

  const runScan = async (includeImported = false) => {
    setScanning(true);
    setPermDenied(false);
    try {
      const granted = await ensurePermission();
      if (!granted) {
        setPermDenied(true);
        setDrafts([]);
        return;
      }
      const { drafts: found } = await scanForDrafts({ lookbackDays, includeImported });
      setDrafts(found);
      if (found.length === 0) message.info(`No new transactions found in the last ${lookbackDays} day(s)`);
    } catch (e) {
      console.error('SMS scan failed:', e);
      message.error('Could not read SMS. Check permission and try again.');
      setDrafts([]);
    } finally {
      setScanning(false);
    }
  };

  const updateDraft = (idx, patch) => {
    setDrafts((prev) => prev.map((d, i) => (i === idx ? { ...d, ...patch } : d)));
  };

  const removeDraft = (idx) => {
    setDrafts((prev) => prev.filter((_, i) => i !== idx));
  };

  const saveOne = async (draft, idx) => {
    if (!draft.category) {
      message.warning('Pick a category first');
      return;
    }
    setSavingId(draft.smsId);
    try {
      await addExpense({
        date: draft.date,
        amount: draft.amount,
        category: draft.category,
        description: draft.description || '',
        isRecurring: false,
        recurringId: null,
      });
      markImported([draft.smsId]);
      removeDraft(idx);
      message.success('Expense added');
    } catch (e) {
      console.error('Save failed:', e);
      message.error('Failed to save expense');
    } finally {
      setSavingId(null);
    }
  };

  const saveAll = async () => {
    const ready = drafts.filter((d) => d.category);
    if (ready.length === 0) {
      message.warning('Assign categories to at least one draft');
      return;
    }
    setSavingId('all');
    const savedIds = [];
    try {
      for (const d of ready) {
        await addExpense({
          date: d.date, amount: d.amount, category: d.category,
          description: d.description || '', isRecurring: false, recurringId: null,
        });
        savedIds.push(d.smsId);
      }
      markImported(savedIds);
      setDrafts((prev) => prev.filter((d) => !savedIds.includes(d.smsId)));
      message.success(`Added ${savedIds.length} expense(s)`);
    } catch (e) {
      console.error('Bulk save failed:', e);
      if (savedIds.length) markImported(savedIds);
      message.error('Some expenses could not be saved');
    } finally {
      setSavingId(null);
    }
  };

  const finish = () => {
    // Nothing to persist here: imported messages are already tracked by smsId,
    // so re-opening the modal reliably re-surfaces anything not yet saved.
    onClose();
  };

  return (
    <Modal
      title="Import expenses from SMS"
      open={true}
      onCancel={finish}
      width={560}
      footer={
        drafts && drafts.length > 0 ? (
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <Button onClick={() => setDrafts(null)} disabled={scanning}>Change range</Button>
            <div style={{ display: 'flex', gap: 8 }}>
              <Button onClick={finish}>Done</Button>
              <Button type="primary" onClick={saveAll} loading={savingId === 'all'} icon={<CheckOutlined />}>
                Add all with a category
              </Button>
            </div>
          </div>
        ) : (
          <Button onClick={finish}>Done</Button>
        )
      }
    >
      {!isSmsAvailable() && (
        <Alert
          type="info" showIcon style={{ marginBottom: 12 }}
          message="SMS import runs on the Android app"
          description="Open this on your phone's Expense Tracker app to scan your bank/UPI messages."
        />
      )}

      {permDenied && (
        <Alert
          type="warning" showIcon style={{ marginBottom: 12 }}
          message="SMS permission needed"
          description="Grant SMS access to let the app read your transaction messages. It only reads them on-device — nothing is uploaded."
        />
      )}

      {drafts === null && (
        <div style={{ textAlign: 'center', padding: '24px 0' }}>
          <p style={{ color: '#666', marginBottom: 16 }}>
            Scan your inbox for bank, UPI, and card transactions. Pick how far
            back to look — handy if you missed a few days.
          </p>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 20, flexWrap: 'wrap' }}>
            <Select
              value={rangePreset}
              style={{ width: 160 }}
              onChange={setRangePreset}
              options={RANGE_PRESETS}
            />
            {rangePreset === 'custom' && (
              <InputNumber
                min={1}
                max={365}
                value={customDays}
                onChange={(v) => setCustomDays(v)}
                addonAfter="days"
                style={{ width: 140 }}
              />
            )}
          </div>
          <Button
            type="primary" size="large" icon={<ScanOutlined />}
            onClick={() => runScan(false)} loading={scanning} disabled={!isSmsAvailable()}
          >
            Scan last {lookbackDays} day(s)
          </Button>
        </div>
      )}

      {scanning && drafts === null && null}

      {drafts !== null && drafts.length === 0 && !scanning && (
        <Empty description="No new transactions to review" />
      )}

      {drafts !== null && drafts.length > 0 && (
        <Spin spinning={scanning}>
          <p style={{ color: '#666', marginBottom: 8 }}>
            {drafts.length} transaction(s) found. Review, set a category, and add.
          </p>
          <List
            dataSource={drafts}
            style={{ maxHeight: 420, overflowY: 'auto' }}
            renderItem={(d, idx) => (
              <List.Item
                key={d.smsId}
                style={{ display: 'block', padding: '12px 0', borderBottom: '1px solid #f0f0f0' }}
              >
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                  <InputNumber
                    value={d.amount} precision={2} min={0} prefix="₹"
                    onChange={(v) => updateDraft(idx, { amount: v })}
                    style={{ width: 130 }}
                  />
                  <DatePicker
                    value={dayjs(d.date)} format="YYYY-MM-DD" allowClear={false}
                    onChange={(v) => updateDraft(idx, { date: v.format('YYYY-MM-DD') })}
                  />
                  {d.needsLlm && <Tag color="orange">low confidence</Tag>}
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 8, flexWrap: 'wrap' }}>
                  <Select
                    value={d.category} placeholder="Category" style={{ width: 170 }}
                    onChange={(v) => updateDraft(idx, { category: v })}
                    status={d.category ? '' : 'warning'}
                  >
                    {categories.map((c) => (
                      <Select.Option key={c.id || c.name} value={c.name}>{c.name}</Select.Option>
                    ))}
                  </Select>
                  <Button
                    type="primary" icon={<CheckOutlined />}
                    loading={savingId === d.smsId}
                    onClick={() => saveOne(d, idx)}
                  >
                    Add
                  </Button>
                  <Button icon={<DeleteOutlined />} onClick={() => removeDraft(idx)} />
                </div>
                <Input
                  value={d.description} size="small" style={{ marginTop: 8 }}
                  placeholder="Description"
                  onChange={(e) => updateDraft(idx, { description: e.target.value })}
                />
                <div style={{ fontSize: 11, color: '#aaa', marginTop: 4 }}>
                  {d.sender} · {d.raw.slice(0, 80)}…
                </div>
              </List.Item>
            )}
          />
        </Spin>
      )}
    </Modal>
  );
};

export default SmsImport;
