// M8-4: 关系设置弹窗
import { Modal, Form, Select, Radio, message } from 'antd';
import { useState } from 'react';
import type { Guest, RelationType } from '@/types';
import { useGuestStore } from '@/stores/guest';

const RELATION_OPTIONS: { label: string; value: RelationType }[] = [
  { label: '必须相邻', value: 'must-adjacent' },
  { label: '偏好同桌', value: 'prefer-same-table' },
  { label: '必须隔离', value: 'must-isolate' },
];

export interface RelationModalProps {
  open: boolean;
  anchorGuest?: Guest;
  onClose: () => void;
}

export function RelationModal({ open, anchorGuest, onClose }: RelationModalProps) {
  const guests = useGuestStore((s) => s.guests);
  const addRelation = useGuestStore((s) => s.addRelation);
  const [otherId, setOtherId] = useState<string>();
  const [type, setType] = useState<RelationType>('prefer-same-table');

  const handleSave = () => {
    if (!anchorGuest || !otherId) {
      message.warning('请选择关联参会者');
      return;
    }
    if (otherId === anchorGuest.id) {
      message.warning('不能与自己建立关系');
      return;
    }
    addRelation({
      id: `rel-${Date.now()}`,
      guestAId: anchorGuest.id,
      guestBId: otherId,
      type,
      constraintLevel: type === 'prefer-same-table' ? 'soft' : 'hard',
    });
    onClose();
  };

  const options = guests
    .filter((g) => g.id !== anchorGuest?.id)
    .map((g) => ({ label: g.name, value: g.id }));

  return (
    <Modal
      title={`设置关系 — ${anchorGuest?.name ?? ''}`}
      open={open}
      onOk={handleSave}
      onCancel={onClose}
      okText="保存"
      cancelText="取消"
    >
      <Form layout="vertical">
        <Form.Item label="关联参会者">
          <Select
            aria-label="rel-other"
            options={options}
            value={otherId}
            onChange={setOtherId}
            placeholder="请选择"
            showSearch
            optionFilterProp="label"
          />
        </Form.Item>
        <Form.Item label="关系类型">
          <Radio.Group
            aria-label="rel-type"
            value={type}
            onChange={(e) => setType(e.target.value)}
            options={RELATION_OPTIONS}
          />
        </Form.Item>
      </Form>
    </Modal>
  );
}
