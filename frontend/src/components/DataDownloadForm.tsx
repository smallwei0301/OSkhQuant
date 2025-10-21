import { useState } from 'react';
import { Form, Select, DatePicker, Radio, message, Space, Button, Alert } from 'antd';
import dayjs from 'dayjs';
import type { Dayjs } from 'dayjs';
import { useDownloadData } from '../services/api';
import { DEFAULT_DOWNLOAD_SETTINGS } from '../config/defaults';

const { RangePicker } = DatePicker;

interface Props {
  onTaskCreated?: (taskId: string) => void;
}

interface FormValues {
  symbols: string[];
  frequency: string;
  startDate: string;
  endDate: string;
  adjustment: string;
  dateRange?: [Dayjs, Dayjs];
}

const frequencyOptions = [
  { label: '日線', value: 'daily' },
  { label: '週線', value: 'weekly' },
  { label: '月線', value: 'monthly' },
  { label: '分鐘', value: 'minute' }
];

const adjustmentOptions = [
  { label: '不復權', value: 'none' },
  { label: '前復權', value: 'forward' },
  { label: '後復權', value: 'backward' }
];

function DataDownloadForm({ onTaskCreated }: Props) {
  const [form] = Form.useForm<FormValues>();
  const [taskId, setTaskId] = useState<string | null>(null);
  const downloadMutation = useDownloadData();

  const onFinish = async (values: FormValues) => {
    try {
      const symbols = values.symbols.map((symbol) => symbol.trim()).filter(Boolean);
      if (!symbols.length) {
        message.warning('請輸入有效的股票代號');
        return;
      }
      const payload = {
        symbols,
        frequency: values.frequency,
        startDate: values.startDate,
        endDate: values.endDate,
        adjustment: values.adjustment
      };
      const data = await downloadMutation.mutateAsync(payload);
      setTaskId(data.taskId);
      onTaskCreated?.(data.taskId);
      message.success('已送出資料下載任務');
    } catch (error) {
      message.error('送出任務時發生錯誤，請稍後再試');
    }
  };

  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      <Form
        layout="vertical"
        form={form}
        onFinish={onFinish}
        initialValues={DEFAULT_DOWNLOAD_SETTINGS}
      >
        <Form.Item
          name="symbols"
          label="股票代號"
          rules={[{ required: true, message: '請輸入至少一檔股票代號' }]}
        >
          <Select
            mode="tags"
            tokenSeparators={[',', '\n', '\t', ' ']}
            placeholder="輸入股票代號，按 Enter 加入 (例如: 2330, 2317)"
          />
        </Form.Item>
        <Form.Item name="frequency" label="資料週期" rules={[{ required: true, message: '請選擇週期' }]}
        >
          <Radio.Group options={frequencyOptions} optionType="button" buttonStyle="solid" />
        </Form.Item>
        <Form.Item name="dateRange" label="時間區間" rules={[{ required: true, message: '請選擇時間區間' }]}
        >
          <RangePicker
            style={{ width: '100%' }}
            format="YYYY-MM-DD"
            onChange={(dates) => {
              form.setFieldValue('startDate', dates?.[0]?.format('YYYY-MM-DD'));
              form.setFieldValue('endDate', dates?.[1]?.format('YYYY-MM-DD'));
            }}
            disabledDate={(current) => current && current > dayjs().endOf('day')}
          />
        </Form.Item>
        <Form.Item name="startDate" hidden>
          <input type="hidden" />
        </Form.Item>
        <Form.Item name="endDate" hidden>
          <input type="hidden" />
        </Form.Item>
        <Form.Item name="adjustment" label="復權方式" rules={[{ required: true, message: '請選擇復權方式' }]}
        >
          <Radio.Group options={adjustmentOptions} optionType="button" buttonStyle="solid" />
        </Form.Item>
        <Form.Item shouldUpdate noStyle>
          {() => (
            <Button type="primary" htmlType="submit" loading={downloadMutation.isPending}>
              送出下載任務
            </Button>
          )}
        </Form.Item>
      </Form>
      {taskId && <Alert message={`任務已建立，ID: ${taskId}`} type="success" showIcon />}
    </Space>
  );
}

export default DataDownloadForm;
