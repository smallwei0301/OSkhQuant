import { useState } from 'react';
import { Form, Input, InputNumber, DatePicker, Select, Radio, Upload, Button, message, Space, Card } from 'antd';
import type { RcFile, UploadChangeParam, UploadFile } from 'antd/es/upload/interface';
import dayjs from 'dayjs';
import type { Dayjs } from 'dayjs';
import { InboxOutlined } from '@ant-design/icons';
import type { BacktestFormValues } from '../types/backtest';
import { useBacktestRun } from '../services/api';
import { DEFAULT_RSI_SETTINGS } from '../config/defaults';

const { RangePicker } = DatePicker;

type BacktestFormFields = Omit<BacktestFormValues, 'files'> & {
  dateRange?: [Dayjs, Dayjs];
};

function BacktestConfigForm() {
  const [form] = Form.useForm<BacktestFormFields>();
  const [fileList, setFileList] = useState<UploadFile<RcFile>[]>([]);
  const backtestMutation = useBacktestRun();
  const [taskId, setTaskId] = useState<string | null>(null);

  const handleUploadChange = ({ fileList: newList }: UploadChangeParam<UploadFile<RcFile>>) => {
    const accepted = newList.filter((file) =>
      ['application/x-python-code', 'text/x-python', 'text/plain'].includes(file.type || '') ||
      file.name.endsWith('.py') ||
      file.name.endsWith('.kh')
    );
    if (accepted.length !== newList.length) {
      message.warning('僅支援上傳 .py 或 .kh 檔案');
    }
    setFileList(accepted);
  };

  const onFinish = async (values: BacktestFormFields) => {
    try {
      const files = fileList.flatMap<RcFile>((file) => (file.originFileObj ? [file.originFileObj] : []));
      if (!files.length) {
        message.warning('請上傳至少一個策略檔案');
        return;
      }
      const symbols = values.symbolList.map((symbol) => symbol.trim()).filter(Boolean);
      if (!symbols.length) {
        message.warning('請輸入有效的股票代號');
        return;
      }
      const payload: BacktestFormValues = {
        strategyName: values.strategyName,
        rsi: values.rsi,
        capital: values.capital,
        symbolList: symbols,
        startDate: values.startDate,
        endDate: values.endDate,
        positionSizing: values.positionSizing,
        slippage: values.slippage,
        commission: values.commission,
        files
      };
      const data = await backtestMutation.mutateAsync(payload);
      setTaskId(data.taskId);
      message.success('已送出回測任務');
    } catch (error) {
      message.error('送出回測任務失敗，請稍後再試');
    }
  };

  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      <Card title="RSI 指標參數">
        <Space direction="vertical" style={{ width: '100%' }}>
          <Form
            layout="vertical"
            form={form}
            onFinish={onFinish}
            initialValues={DEFAULT_RSI_SETTINGS}
          >
            <Form.Item name="strategyName" label="策略名稱" rules={[{ required: true, message: '請輸入策略名稱' }]}
            >
              <Input placeholder="例如：RSI" />
            </Form.Item>
            <Form.Item
              label="股票代號"
              name="symbolList"
              rules={[{ required: true, message: '請輸入股票代號' }]}
            >
              <Select mode="tags" placeholder="輸入股票代號" tokenSeparators={[',', ' ']}
              />
            </Form.Item>
            <Form.Item label="回測時間" name="dateRange" rules={[{ required: true, message: '請選擇回測時間' }]}
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
            <Form.Item label="部位控管" name="positionSizing" rules={[{ required: true }]}>
              <Radio.Group>
                <Radio.Button value="fixed">固定張數</Radio.Button>
                <Radio.Button value="percent">資金比例</Radio.Button>
              </Radio.Group>
            </Form.Item>
            <Form.Item label="滑價 (%)" name="slippage" rules={[{ required: true }]}
            >
              <InputNumber min={0} step={0.01} precision={2} style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item label="手續費 (%)" name="commission" rules={[{ required: true }]}
            >
              <InputNumber min={0} step={0.0001} precision={4} style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item label="RSI 週期" name={['rsi', 'period']} rules={[{ required: true }]}
            >
              <InputNumber min={1} max={100} style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item label="超買" name={['rsi', 'overbought']} rules={[{ required: true }]}
            >
              <InputNumber min={50} max={100} style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item label="超賣" name={['rsi', 'oversold']} rules={[{ required: true }]}
            >
              <InputNumber min={0} max={50} style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item label="計算週期" name={['rsi', 'timeframe']} rules={[{ required: true }]}
            >
              <Select
                options={[
                  { label: '日線 (1d)', value: '1d' },
                  { label: '60 分 (60m)', value: '60m' },
                  { label: '15 分 (15m)', value: '15m' }
                ]}
              />
            </Form.Item>
            <Form.Item label="初始資金" name={['capital', 'initialCapital']} rules={[{ required: true }]}
            >
              <InputNumber min={100000} step={10000} style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item label="同時持有上限" name={['capital', 'maxPositions']} rules={[{ required: true }]}
            >
              <InputNumber min={1} max={20} style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item label="單筆風險比例" name={['capital', 'riskPerTrade']} rules={[{ required: true }]}
            >
              <InputNumber min={0.001} max={0.2} step={0.001} style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item label="策略檔案" required>
              <Upload.Dragger
                name="files"
                multiple
                fileList={fileList}
                beforeUpload={() => false}
                accept=".py,.kh"
                onChange={handleUploadChange}
              >
                <p className="ant-upload-drag-icon">
                  <InboxOutlined />
                </p>
                <p className="ant-upload-text">拖曳或點擊上傳策略檔 (.py / .kh)</p>
              </Upload.Dragger>
            </Form.Item>
            <Form.Item shouldUpdate>
              {() => (
                <Button type="primary" htmlType="submit" loading={backtestMutation.isPending}>
                  開始回測
                </Button>
              )}
            </Form.Item>
          </Form>
        </Space>
      </Card>
      {taskId && <Card type="inner" title="回測任務已建立" extra={`ID: ${taskId}`} />}
    </Space>
  );
}

export default BacktestConfigForm;
