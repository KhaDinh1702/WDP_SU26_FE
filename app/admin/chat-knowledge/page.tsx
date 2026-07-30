'use client';

import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Bot,
  Plus,
  Pencil,
  Power,
  RefreshCw,
  Search,
  Trash2,
  X,
  AlertCircle,
  BookOpenText,
  SearchX,
} from 'lucide-react';
import { toast } from 'sonner';

import { AdminTopbar } from '@/components/admin/AdminTopbar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { EmptyState } from '@/components/ui/empty-state';
import {
  adminGetChatKnowledge,
  adminCreateChatKnowledge,
  adminUpdateChatKnowledge,
  adminDeleteChatKnowledge,
  type ChatKnowledgePayload,
} from '@/lib/admin-api';
import { getErrorMessage } from '@/lib/getErrorMessage';
import { cn } from '@/lib/utils';

type KnowledgeEntry = {
  id?: string;
  _id?: string;
  question: string;
  answer: string;
  keywords?: string[];
  category?: string;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
};

const getEntryId = (e: KnowledgeEntry) => e.id ?? e._id ?? '';

/** Modal tạo mới / chỉnh sửa một mục kiến thức. `item = null` nghĩa là tạo mới. */
function KnowledgeModal({
  item,
  categories,
  onClose,
  onSave,
  isPending,
}: {
  item: KnowledgeEntry | null;
  categories: string[];
  onClose: () => void;
  onSave: (data: ChatKnowledgePayload) => void;
  isPending: boolean;
}) {
  const [form, setForm] = useState({
    question: item?.question ?? '',
    answer: item?.answer ?? '',
    keywords: (item?.keywords ?? []).join(', '),
    category: item?.category ?? '',
  });

  const canSave = form.question.trim() !== '' && form.answer.trim() !== '';

  const handleSubmit = () => {
    if (!canSave) {
      toast.warning('Vui lòng nhập đầy đủ câu hỏi và câu trả lời.');
      return;
    }
    onSave({
      question: form.question.trim(),
      answer: form.answer.trim(),
      keywords: form.keywords
        .split(',')
        .map((k) => k.trim())
        .filter(Boolean),
      category: form.category.trim() || undefined,
    });
  };

  return (
    <div
      className='fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in duration-150'
      onClick={onClose}
    >
      <div
        className='w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-xl animate-in zoom-in-95 duration-150'
        onClick={(e) => e.stopPropagation()}
      >
        <div className='mb-5 flex items-center justify-between border-b border-border pb-4'>
          <h3 className='font-heading text-lg font-bold text-foreground'>
            {item ? 'Sửa mục kiến thức' : 'Thêm kiến thức mới'}
          </h3>
          <button
            type='button'
            onClick={onClose}
            aria-label='Đóng'
            className='rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground'
          >
            <X className='size-5' />
          </button>
        </div>

        <div className='flex flex-col gap-4'>
          <div className='space-y-1.5'>
            <Label htmlFor='ck-question'>Câu hỏi *</Label>
            <Input
              id='ck-question'
              placeholder='VD: Cửa hàng mở cửa lúc mấy giờ?'
              value={form.question}
              onChange={(e) => setForm({ ...form, question: e.target.value })}
              className='h-11 rounded-xl'
              disabled={isPending}
            />
          </div>

          <div className='space-y-1.5'>
            <Label htmlFor='ck-answer'>Câu trả lời *</Label>
            <Textarea
              id='ck-answer'
              placeholder='VD: WAVE mở cửa 07:00 - 21:00 mỗi ngày.'
              value={form.answer}
              onChange={(e) => setForm({ ...form, answer: e.target.value })}
              className='min-h-[110px] resize-none rounded-xl'
              disabled={isPending}
            />
          </div>

          <div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
            <div className='space-y-1.5'>
              <Label htmlFor='ck-keywords'>Từ khóa</Label>
              <Input
                id='ck-keywords'
                placeholder='giờ mở cửa, opening hours'
                value={form.keywords}
                onChange={(e) =>
                  setForm({ ...form, keywords: e.target.value })
                }
                className='h-11 rounded-xl'
                disabled={isPending}
              />
              <p className='text-xs text-muted-foreground'>
                Phân tách bằng dấu phẩy.
              </p>
            </div>
            <div className='space-y-1.5'>
              <Label htmlFor='ck-category'>Danh mục</Label>
              <Input
                id='ck-category'
                list='ck-category-options'
                placeholder='policy, service, pricing...'
                value={form.category}
                onChange={(e) =>
                  setForm({ ...form, category: e.target.value })
                }
                className='h-11 rounded-xl'
                disabled={isPending}
              />
              <datalist id='ck-category-options'>
                {categories.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </div>
          </div>
        </div>

        <div className='mt-6 flex justify-end gap-2.5 border-t border-border pt-4'>
          <Button variant='outline' onClick={onClose} disabled={isPending}>
            Hủy
          </Button>
          <Button onClick={handleSubmit} disabled={isPending || !canSave}>
            {isPending && <Spinner />}
            {item ? 'Lưu thay đổi' : 'Thêm kiến thức'}
          </Button>
        </div>
      </div>
    </div>
  );
}

/** Hộp xác nhận xóa — xóa là vĩnh viễn nên bắt xác nhận rõ ràng. */
function DeleteDialog({
  item,
  onClose,
  onConfirm,
  isPending,
}: {
  item: KnowledgeEntry;
  onClose: () => void;
  onConfirm: () => void;
  isPending: boolean;
}) {
  return (
    <div
      className='fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in duration-150'
      onClick={onClose}
    >
      <div
        className='w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-xl animate-in zoom-in-95 duration-150'
        onClick={(e) => e.stopPropagation()}
      >
        <div className='flex items-start gap-3'>
          <div className='flex size-10 shrink-0 items-center justify-center rounded-full bg-destructive/10 text-destructive'>
            <Trash2 className='size-5' />
          </div>
          <div className='min-w-0'>
            <h3 className='font-heading text-base font-bold text-foreground'>
              Xóa mục kiến thức này?
            </h3>
            <p className='mt-1 text-sm text-muted-foreground'>
              Trợ lý AI sẽ không dùng câu trả lời này nữa. Hành động không thể
              hoàn tác.
            </p>
            <p className='mt-2 truncate rounded-lg bg-muted/60 px-3 py-2 text-xs font-medium text-foreground'>
              {item.question}
            </p>
          </div>
        </div>
        <div className='mt-5 flex justify-end gap-2.5'>
          <Button variant='outline' onClick={onClose} disabled={isPending}>
            Hủy
          </Button>
          <Button
            variant='destructive'
            onClick={onConfirm}
            disabled={isPending}
          >
            {isPending && <Spinner />}
            Xóa vĩnh viễn
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function AdminChatKnowledgePage() {
  const qc = useQueryClient();

  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  // false = đóng modal, null = tạo mới, entry = đang sửa
  const [editEntry, setEditEntry] = useState<KnowledgeEntry | null | false>(
    false,
  );
  const [deleteTarget, setDeleteTarget] = useState<KnowledgeEntry | null>(null);

  const { data, isLoading, isError, refetch, isRefetching } = useQuery({
    queryKey: ['admin-chat-knowledge'],
    queryFn: adminGetChatKnowledge,
  });
  const entries: KnowledgeEntry[] = useMemo(
    () => data?.data?.data ?? data?.data ?? [],
    [data],
  );

  const invalidate = () =>
    qc.invalidateQueries({ queryKey: ['admin-chat-knowledge'] });

  const createEntry = useMutation({
    mutationFn: adminCreateChatKnowledge,
    onSuccess: () => {
      toast.success('Đã thêm kiến thức mới cho trợ lý AI.');
      invalidate();
      setEditEntry(false);
    },
    onError: (err) =>
      toast.error('Thêm thất bại.', { description: getErrorMessage(err) }),
  });

  const updateEntry = useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: Partial<ChatKnowledgePayload>;
    }) => adminUpdateChatKnowledge(id, data),
    onSuccess: () => {
      toast.success('Đã cập nhật mục kiến thức.');
      invalidate();
      setEditEntry(false);
    },
    onError: (err) =>
      toast.error('Cập nhật thất bại.', { description: getErrorMessage(err) }),
  });

  const toggleEntry = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      adminUpdateChatKnowledge(id, { isActive }),
    onSuccess: (_, v) => {
      toast.success(
        v.isActive
          ? 'Đã bật — AI sẽ dùng kiến thức này khi trả lời.'
          : 'Đã tắt — AI sẽ bỏ qua kiến thức này.',
      );
      invalidate();
    },
    onError: (err) =>
      toast.error('Không thể đổi trạng thái.', {
        description: getErrorMessage(err),
      }),
  });

  const deleteEntry = useMutation({
    mutationFn: adminDeleteChatKnowledge,
    onSuccess: () => {
      toast.success('Đã xóa mục kiến thức.');
      invalidate();
      setDeleteTarget(null);
    },
    onError: (err) =>
      toast.error('Xóa thất bại.', { description: getErrorMessage(err) }),
  });

  // Danh mục hiện có (cho filter + gợi ý trong modal).
  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const e of entries) if (e.category?.trim()) set.add(e.category.trim());
    return Array.from(set).sort();
  }, [entries]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return entries.filter((e) => {
      if (categoryFilter !== 'all' && e.category !== categoryFilter)
        return false;
      if (!term) return true;
      return [e.question, e.answer, e.category ?? '', ...(e.keywords ?? [])]
        .join(' ')
        .toLowerCase()
        .includes(term);
    });
  }, [entries, search, categoryFilter]);

  const activeCount = entries.filter((e) => e.isActive !== false).length;
  const hasFilters = search.trim() !== '' || categoryFilter !== 'all';

  const handleSave = (payload: ChatKnowledgePayload) => {
    if (editEntry && getEntryId(editEntry as KnowledgeEntry)) {
      updateEntry.mutate({
        id: getEntryId(editEntry as KnowledgeEntry),
        data: payload,
      });
    } else {
      createEntry.mutate(payload);
    }
  };

  return (
    <>
      <AdminTopbar
        title='Huấn luyện AI'
        subtitle='Kho kiến thức Hỏi–Đáp cho trợ lý ảo WAVE'
      />

      <main className='flex-1 overflow-y-auto bg-muted/30 p-4 sm:p-6 lg:p-8'>
        <div className='mx-auto flex max-w-5xl flex-col gap-5'>
          {/* Header / actions */}
          <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
            <div>
              <h2 className='font-heading text-lg font-bold text-foreground'>
                Kho kiến thức trợ lý AI
              </h2>
              <p className='mt-0.5 text-sm text-muted-foreground tabular-nums'>
                {entries.length} mục · {activeCount} đang bật — AI ưu tiên các
                câu trả lời này khi khách hỏi.
              </p>
            </div>
            <div className='flex items-center gap-2.5'>
              <Button
                variant='outline'
                onClick={() => refetch()}
                disabled={isRefetching}
              >
                <RefreshCw className={isRefetching ? 'animate-spin' : ''} />
                Làm mới
              </Button>
              <Button onClick={() => setEditEntry(null)}>
                <Plus />
                Thêm kiến thức
              </Button>
            </div>
          </div>

          {/* Toolbar: tìm kiếm + lọc danh mục */}
          <div className='flex flex-col gap-2.5 sm:flex-row sm:items-center'>
            <div className='relative flex-1'>
              <Search className='absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground' />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder='Tìm theo câu hỏi, câu trả lời, từ khóa...'
                className='h-10 rounded-xl pl-9'
                aria-label='Tìm kiếm kiến thức'
              />
            </div>
            {categories.length > 0 && (
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                aria-label='Lọc theo danh mục'
                className='h-10 shrink-0 cursor-pointer rounded-xl border border-border bg-card px-3 text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20'
              >
                <option value='all'>Tất cả danh mục</option>
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Content */}
          {isLoading ? (
            <div className='flex flex-col gap-3'>
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className='h-28 animate-pulse rounded-2xl border border-border bg-card'
                />
              ))}
            </div>
          ) : isError ? (
            <EmptyState
              icon={AlertCircle}
              title='Không tải được kho kiến thức'
              description='Đã xảy ra lỗi khi kết nối tới máy chủ. Vui lòng thử lại.'
              action={
                <Button variant='outline' onClick={() => refetch()}>
                  <RefreshCw />
                  Thử lại
                </Button>
              }
            />
          ) : filtered.length === 0 ? (
            hasFilters ? (
              <EmptyState
                icon={SearchX}
                title='Không có mục nào khớp bộ lọc'
                description='Thử từ khóa khác hoặc xóa bộ lọc để xem toàn bộ kiến thức.'
                action={
                  <Button
                    variant='outline'
                    onClick={() => {
                      setSearch('');
                      setCategoryFilter('all');
                    }}
                  >
                    Xóa bộ lọc
                  </Button>
                }
              />
            ) : (
              <EmptyState
                icon={BookOpenText}
                title='Chưa có kiến thức nào'
                description='Thêm các cặp Hỏi–Đáp (giờ mở cửa, bảng giá, chính sách...) để trợ lý AI trả lời khách chính xác hơn.'
                action={
                  <Button onClick={() => setEditEntry(null)}>
                    <Plus />
                    Thêm kiến thức đầu tiên
                  </Button>
                }
              />
            )
          ) : (
            <div className='flex flex-col gap-3'>
              {filtered.map((entry) => {
                const id = getEntryId(entry);
                const active = entry.isActive !== false;
                return (
                  <div
                    key={id}
                    className={cn(
                      'rounded-2xl border border-border bg-card p-4 shadow-sm transition-opacity sm:p-5',
                      !active && 'opacity-60',
                    )}
                  >
                    <div className='flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between'>
                      <div className='min-w-0 flex-1'>
                        <div className='flex flex-wrap items-center gap-2'>
                          <Bot className='size-4 shrink-0 text-primary' />
                          <p className='font-semibold text-foreground'>
                            {entry.question}
                          </p>
                        </div>
                        <p className='mt-1.5 line-clamp-2 text-sm text-muted-foreground'>
                          {entry.answer}
                        </p>
                        <div className='mt-2.5 flex flex-wrap items-center gap-1.5'>
                          <span
                            className={cn(
                              'rounded-full px-2 py-0.5 text-[11px] font-semibold',
                              active
                                ? 'bg-success/10 text-success'
                                : 'bg-muted text-muted-foreground',
                            )}
                          >
                            {active ? 'Đang bật' : 'Đang tắt'}
                          </span>
                          {entry.category && (
                            <span className='rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary'>
                              {entry.category}
                            </span>
                          )}
                          {(entry.keywords ?? []).map((k) => (
                            <span
                              key={k}
                              className='rounded-full border border-border bg-muted/50 px-2 py-0.5 text-[11px] font-medium text-muted-foreground'
                            >
                              {k}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className='flex shrink-0 items-center gap-1.5'>
                        <Button
                          size='sm'
                          variant='outline'
                          onClick={() => setEditEntry(entry)}
                        >
                          <Pencil />
                          Sửa
                        </Button>
                        <Button
                          size='sm'
                          variant='outline'
                          disabled={toggleEntry.isPending}
                          onClick={() =>
                            toggleEntry.mutate({ id, isActive: !active })
                          }
                        >
                          <Power />
                          {active ? 'Tắt' : 'Bật'}
                        </Button>
                        <Button
                          size='sm'
                          variant='destructive'
                          onClick={() => setDeleteTarget(entry)}
                        >
                          <Trash2 />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* Create / Edit modal */}
      {editEntry !== false && (
        <KnowledgeModal
          item={editEntry}
          categories={categories}
          onClose={() => setEditEntry(false)}
          onSave={handleSave}
          isPending={createEntry.isPending || updateEntry.isPending}
        />
      )}

      {/* Delete confirm */}
      {deleteTarget && (
        <DeleteDialog
          item={deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onConfirm={() => deleteEntry.mutate(getEntryId(deleteTarget))}
          isPending={deleteEntry.isPending}
        />
      )}
    </>
  );
}
