import { useState, useEffect } from 'react';
import { Check, X, HelpCircle } from 'lucide-react';
import type { ApprovalStatus } from '../types';

interface ApprovalCardProps {
  title: string;
  status: ApprovalStatus;
  comment?: string;
  approvedAt?: string;
  canEdit: boolean;
  onUpdate: (status: ApprovalStatus, comment?: string) => Promise<void>;
}

export const ApprovalCard = ({
  title,
  status,
  comment,
  approvedAt,
  canEdit,
  onUpdate
}: ApprovalCardProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<ApprovalStatus>(status);
  const [newComment, setNewComment] = useState(comment || '');
  const [isSaving, setIsSaving] = useState(false);

  // Sync state with props when they change
  useEffect(() => {
    setSelectedStatus(status);
    setNewComment(comment || '');
  }, [status, comment]);

  const getStatusIcon = (approvalStatus: ApprovalStatus) => {
    switch (approvalStatus) {
      case 'approved':
        return <Check className="w-6 h-6 text-green-600" />;
      case 'approved_with_comments':
        return <HelpCircle className="w-6 h-6 text-yellow-600" />;
      case 'not_approved':
      default:
        return <X className="w-6 h-6 text-fuchsia-600" />;
    }
  };

  const getStatusLabel = (approvalStatus: ApprovalStatus) => {
    switch (approvalStatus) {
      case 'approved':
        return 'Согласовано';
      case 'approved_with_comments':
        return 'Согласовано с комментариями';
      case 'not_approved':
      default:
        return 'Не согласовано';
    }
  };

  const getStatusColor = (approvalStatus: ApprovalStatus) => {
    switch (approvalStatus) {
      case 'approved':
        return 'bg-green-50 border-green-200';
      case 'approved_with_comments':
        return 'bg-yellow-50 border-yellow-200';
      case 'not_approved':
      default:
        return 'bg-fuchsia-50 border-fuchsia-200';
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onUpdate(selectedStatus, newComment || undefined);
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to update approval:', error);
      alert('Не удалось обновить согласование');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setSelectedStatus(status);
    setNewComment(comment || '');
    setIsEditing(false);
  };

  return (
    <div className={`p-4 rounded-lg border ${getStatusColor(status)}`}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        {getStatusIcon(status)}
      </div>

      {!isEditing ? (
        <>
          <div className="mb-2">
            <span className="text-sm font-medium text-gray-700">
              Статус: {getStatusLabel(status)}
            </span>
          </div>

          {comment && (
            <div className="mb-2">
              <p className="text-sm text-gray-600">
                <span className="font-medium">Комментарий:</span> {comment}
              </p>
            </div>
          )}

          {approvedAt && status !== 'not_approved' && (
            <div className="mb-3">
              <p className="text-xs text-gray-500">
                {new Date(approvedAt).toLocaleString('ru-RU')}
              </p>
            </div>
          )}

          {canEdit && (
            <button
              onClick={() => setIsEditing(true)}
              className="w-full px-4 py-2 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            >
              Изменить статус
            </button>
          )}
        </>
      ) : (
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Статус согласования
            </label>
            <div className="space-y-2">
              <label className={`flex items-center p-2 border rounded-lg cursor-pointer transition-colors ${
                selectedStatus === 'approved' ? 'bg-green-50 border-green-300' : 'hover:bg-gray-50'
              } ${isSaving ? 'opacity-50 cursor-not-allowed' : ''}`}>
                <input
                  type="radio"
                  name={`approval-${title}`}
                  value="approved"
                  checked={selectedStatus === 'approved'}
                  onChange={() => setSelectedStatus('approved')}
                  disabled={isSaving}
                  className="mr-3"
                />
                <Check className="w-5 h-5 text-green-600 mr-2" />
                <span className="text-sm">Согласовано</span>
              </label>

              <label className={`flex items-center p-2 border rounded-lg cursor-pointer transition-colors ${
                selectedStatus === 'approved_with_comments' ? 'bg-yellow-50 border-yellow-300' : 'hover:bg-gray-50'
              } ${isSaving ? 'opacity-50 cursor-not-allowed' : ''}`}>
                <input
                  type="radio"
                  name={`approval-${title}`}
                  value="approved_with_comments"
                  checked={selectedStatus === 'approved_with_comments'}
                  onChange={() => setSelectedStatus('approved_with_comments')}
                  disabled={isSaving}
                  className="mr-3"
                />
                <HelpCircle className="w-5 h-5 text-yellow-600 mr-2" />
                <span className="text-sm">Согласовано с комментариями</span>
              </label>

              <label className={`flex items-center p-2 border rounded-lg cursor-pointer transition-colors ${
                selectedStatus === 'not_approved' ? 'bg-fuchsia-50 border-fuchsia-300' : 'hover:bg-gray-50'
              } ${isSaving ? 'opacity-50 cursor-not-allowed' : ''}`}>
                <input
                  type="radio"
                  name={`approval-${title}`}
                  value="not_approved"
                  checked={selectedStatus === 'not_approved'}
                  onChange={() => setSelectedStatus('not_approved')}
                  disabled={isSaving}
                  className="mr-3"
                />
                <X className="w-5 h-5 text-fuchsia-600 mr-2" />
                <span className="text-sm">Не согласовано</span>
              </label>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Комментарий
            </label>
            <textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="Опциональный комментарий..."
              disabled={isSaving}
            />
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="flex-1 px-4 py-2 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSaving ? 'Сохранение...' : 'Сохранить'}
            </button>
            <button
              onClick={handleCancel}
              disabled={isSaving}
              className="flex-1 px-4 py-2 text-sm border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Отмена
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
