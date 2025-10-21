import { useMemo } from 'react';
import { Card, Table, Statistic, Row, Col, Space, Empty } from 'antd';
import { LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import type { ColumnsType } from 'antd/es/table';
import type { ResultsResponse, TradeRecord, EquityPoint, TradeSignal } from '../types/results';

interface Props {
  results?: ResultsResponse;
}

function ResultsDashboard({ results }: Props) {
  const tradesColumns: ColumnsType<TradeRecord> = [
    { title: '時間', dataIndex: 'timestamp', key: 'timestamp' },
    { title: '商品', dataIndex: 'symbol', key: 'symbol' },
    { title: '方向', dataIndex: 'side', key: 'side' },
    { title: '數量', dataIndex: 'quantity', key: 'quantity' },
    { title: '價格', dataIndex: 'price', key: 'price' },
    { title: '損益', dataIndex: 'pnl', key: 'pnl' }
  ];

  const signalsColumns: ColumnsType<TradeSignal> = [
    { title: '時間', dataIndex: 'timestamp', key: 'timestamp' },
    { title: '商品', dataIndex: 'symbol', key: 'symbol' },
    { title: '訊號', dataIndex: 'signal', key: 'signal' },
    { title: '信心度', dataIndex: 'confidence', key: 'confidence' }
  ];

  const equityData: EquityPoint[] = useMemo(() => results?.equityCurve ?? [], [results]);

  if (!results) {
    return <Empty description="請先執行回測" />;
  }

  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      <Row gutter={[16, 16]}>
        <Col xs={24} md={16}>
          <Card title="淨值曲線">
            <ResponsiveContainer width="100%" height={320}>
              <LineChart data={equityData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" minTickGap={20} />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="equity" stroke="#3182ce" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card title="成本明細">
            <Statistic title="總手續費" value={results.costs.totalCommission} precision={2} suffix="元" />
            <Statistic title="總滑價" value={results.costs.totalSlippage} precision={2} suffix="元" />
            <Statistic title="交易稅" value={results.costs.totalTax} precision={2} suffix="元" />
          </Card>
        </Col>
      </Row>
      <Row gutter={[16, 16]}>
        <Col xs={24} md={12}>
          <Card title="最大回撤">
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={equityData}>
                <defs>
                  <linearGradient id="drawdownColor" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f56565" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#f56565" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" minTickGap={20} />
                <YAxis />
                <Tooltip />
                <Area type="monotone" dataKey="drawdown" stroke="#c53030" fill="url(#drawdownColor)" />
              </AreaChart>
            </ResponsiveContainer>
          </Card>
        </Col>
        <Col xs={24} md={12}>
          <Card title="交易訊號">
            <Table
              size="small"
              rowKey={(record) => `${record.symbol}-${record.timestamp}`}
              columns={signalsColumns}
              dataSource={results.signals}
              pagination={false}
            />
          </Card>
        </Col>
      </Row>
      <Card title="成交列表">
        <Table rowKey="id" columns={tradesColumns} dataSource={results.trades} pagination={{ pageSize: 10 }} />
      </Card>
    </Space>
  );
}

export default ResultsDashboard;
