'use client';

import { use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft,
  Calendar,
  Car,
  Gift,
  Info,
  Layers,
  Percent,
  ShieldAlert,
  Sparkles,
  Star,
  Ticket,
} from 'lucide-react';
import { toast } from 'sonner';
import { Spinner } from '@/components/ui/spinner';
import { ClaimVoucherBox } from '@/components/voucher/ClaimVoucherBox';
import { useVoucherCampaign } from '@/hooks/vouchers/useVoucherCampaigns';
import {
  getClaimErrorMessage,
  useClaimCampaign,
} from '@/hooks/vouchers/useClaimCampaign';
import {
  getActiveServiceTypes,
  getActiveVehicleTypes,
  getTierConfigs,
} from '@/lib/customer-api';
import {
  CAMPAIGN_CLAIM_LABEL,
  campaignBenefitLabel,
  campaignClaimState,
  campaignHasRestrictions,
  campaignMinOrderLabel,
  campaignStatusMeta,
  campaignWindowLabel,
} from '@/lib/voucher';
import { getTierLabel } from '@/constants/tiers';
import { formatDate } from '@/lib/format';
import { cn } from '@/lib/utils';

/** Nhãn cho `stackingPolicy` — cho khách biết trước có cộng dồn được không. */
const STACKING_LABEL: Record<string, string> = {
  none: 'Không cộng dồn với ưu đãi nào khác',
  with_tier: 'Cộng dồn được với giảm giá theo hạng thành viên',
  with_promotion: 'Cộng dồn được với ưu đãi giờ vàng',
  with_tier_and_promotion:
    'Cộng dồn được với giảm giá theo hạng và ưu đãi giờ vàng',
};

/**
 * Danh mục để đổi id trong `applicable*Ids` / `allowedTierIds` thành tên đọc
 * được. Cả ba endpoint đều công khai. Chỉ tải khi chiến dịch thực sự có giới
 * hạn — chiến dịch không giới hạn (mảng rỗng) thì không cần gọi.
 */
type NamedRef = {
  id?: string;
  _id?: string;
  name?: string;
  tierName?: string;
};

function useNameLookup(enabled: boolean) {
  const services = useQuery({
    queryKey: ['service-types'],
    queryFn: getActiveServiceTypes,
    enabled,
  });
  const vehicleTypes = useQuery({
    queryKey: ['vehicle-types'],
    queryFn: getActiveVehicleTypes,
    enabled,
  });
  const tiers = useQuery({
    queryKey: ['tier-configs'],
    queryFn: getTierConfigs,
    enabled,
  });

  const toMap = (payload: unknown): Map<string, string> => {
    const body = payload as { data?: { data?: NamedRef[] } | NamedRef[] };
    const list = Array.isArray(body?.data)
      ? body.data
      : ((body?.data as { data?: NamedRef[] })?.data ?? []);
    const map = new Map<string, string>();
    for (const item of list) {
      const key = item._id ?? item.id;
      // Hạng thành viên hiển thị qua nguồn tên duy nhất của app, không dùng
      // thẳng enum `tierName` của BE.
      const label = item.tierName ? getTierLabel(item.tierName) : item.name;
      if (key && label) map.set(key, label);
    }
    return map;
  };

  return {
    isLoading:
      enabled &&
      (services.isLoading || vehicleTypes.isLoading || tiers.isLoading),
    serviceNames: toMap(services.data),
    vehicleTypeNames: toMap(vehicleTypes.data),
    tierNames: toMap(tiers.data),
  };
}

/**
 * Đổi danh sách id thành tên; id nào không tra được thì bỏ qua thay vì in ra
 * chuỗi ObjectId cho khách đọc.
 */
function namesOf(ids: string[] | undefined, lookup: Map<string, string>) {
  return (ids ?? []).map((id) => lookup.get(id)).filter(Boolean) as string[];
}

export default function PromotionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { data: campaign, isLoading, error } = useVoucherCampaign(id);

  const hasRestrictions = campaign ? campaignHasRestrictions(campaign) : false;
  const lookup = useNameLookup(hasRestrictions);

  const claim = useClaimCampaign();

  /** Nhận thẳng voucher của chiến dịch — không cần khách biết mã. */
  const handleClaim = () => {
    claim.mutate(id, {
      onSuccess: (voucher) =>
        toast.success(
          `Đã nhận ${voucher.code}! Xem trong mục "Voucher của tôi".`,
        ),
      onError: (err) => toast.error(getClaimErrorMessage(err)),
    });
  };

  if (isLoading) {
    return (
      <div className='flex min-h-[400px] flex-col items-center justify-center gap-3'>
        <Spinner className='size-8 text-primary' />
        <p className='text-sm font-semibold text-muted-foreground'>
          Đang tải ưu đãi...
        </p>
      </div>
    );
  }

  if (error || !campaign) {
    return (
      <div className='space-y-4'>
        <button
          onClick={() => router.push('/profile/promotions')}
          className='inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-primary'
        >
          <ArrowLeft className='w-4 h-4' /> Quay lại
        </button>
        <div className='space-y-2 rounded-xl border border-destructive/30 bg-destructive/10 p-6 text-center text-destructive'>
          <Info className='mx-auto h-8 w-8' />
          <h3 className='font-heading text-lg font-bold'>
            Không tìm thấy ưu đãi
          </h3>
          <p className='text-sm'>
            Chương trình không tồn tại, chưa được công bố hoặc đã bị gỡ.
          </p>
        </div>
      </div>
    );
  }

  const meta = campaignStatusMeta(campaign.status);
  // Biết trước nhận được hay không nhờ alreadyClaimed/soldOut/remaining.
  const claimState = campaignClaimState(campaign);
  const isFreeService = campaign.benefitType === 'free_service';
  const minOrder = campaignMinOrderLabel(campaign);
  const serviceNames = namesOf(
    campaign.applicableServiceTypeIds,
    lookup.serviceNames,
  );
  const vehicleTypeNames = namesOf(
    campaign.applicableVehicleTypeIds,
    lookup.vehicleTypeNames,
  );
  const tierNames = namesOf(campaign.allowedTierIds, lookup.tierNames);

  return (
    <div className='space-y-6 animate-fade-in'>
      <button
        onClick={() => router.push('/profile/promotions')}
        className='inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-primary'
      >
        <ArrowLeft className='w-4 h-4' /> Quay lại danh sách ưu đãi
      </button>

      {/* Hero */}
      <div className='flex flex-col overflow-hidden rounded-xl border border-border/60 bg-card shadow-xs sm:flex-row'>
        <div
          className='relative flex shrink-0 flex-col items-center justify-center bg-gradient-to-br from-primary to-blue-700 p-6 text-center text-white sm:w-48'
          style={
            campaign.themeColor ? { background: campaign.themeColor } : undefined
          }
        >
          <span className='text-[11px] font-semibold uppercase tracking-widest text-white/70'>
            {isFreeService ? 'Tặng' : 'Giảm'}
          </span>
          {isFreeService ? (
            <Gift className='my-2 h-12 w-12' />
          ) : (
            <Percent className='my-2 h-10 w-10' />
          )}
          <span className='mt-1 rounded-full bg-white/15 px-3 py-1 text-xs font-bold'>
            {campaignBenefitLabel(campaign)}
          </span>
        </div>

        <div className='flex-1 space-y-3 p-6'>
          <div className='flex items-start justify-between gap-3'>
            <h1 className='font-heading text-xl font-semibold text-foreground'>
              {campaign.title}
            </h1>
            <span
              className={cn(
                'shrink-0 rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-wider',
                meta.badgeClass,
              )}
            >
              {meta.label}
            </span>
          </div>
          {campaign.description && (
            <p className='text-sm text-muted-foreground'>
              {campaign.description}
            </p>
          )}
          {!meta.claimable && (
            <p className='flex items-start gap-1.5 text-xs font-semibold text-warning'>
              <ShieldAlert className='mt-px size-3.5 shrink-0' />
              {campaign.status === 'scheduled'
                ? `Chương trình mở từ ${formatDate(campaign.validFrom)} — chưa nhận được lúc này.`
                : campaign.status === 'paused'
                  ? 'Chương trình đang tạm dừng nhận thêm người tham gia.'
                  : 'Chương trình đã kết thúc.'}
            </p>
          )}
          {meta.claimable && (
            <div className='flex flex-wrap items-center gap-2'>
              {claimState === 'claimable' ? (
                <button
                  type='button'
                  onClick={handleClaim}
                  disabled={claim.isPending}
                  aria-busy={claim.isPending}
                  className='inline-flex items-center gap-1.5 rounded-lg bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground shadow-xs transition-colors hover:bg-primary/90 disabled:opacity-60'
                >
                  {claim.isPending ? (
                    <Spinner className='size-4' />
                  ) : (
                    <Ticket className='size-4' />
                  )}
                  {claim.isPending ? 'Đang nhận...' : 'Nhận ưu đãi'}
                </button>
              ) : (
                <span
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-lg px-5 py-2.5 text-sm font-bold',
                    claimState === 'claimed'
                      ? 'bg-success/10 text-success'
                      : 'bg-muted text-muted-foreground',
                  )}
                >
                  <Ticket className='size-4' />
                  {CAMPAIGN_CLAIM_LABEL[claimState]}
                </span>
              )}
              <Link
                href='/booking'
                className='inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-5 py-2.5 text-sm font-bold text-foreground transition-colors hover:bg-muted'
              >
                <Sparkles className='size-4 text-primary' /> Đặt lịch rửa xe
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Thông tin chính */}
      <div className='divide-y divide-border/50 rounded-xl border border-border/60 bg-card shadow-xs'>
        <DetailRow
          icon={Percent}
          label='Ưu đãi'
          value={campaignBenefitLabel(campaign)}
        />
        {minOrder && (
          <DetailRow icon={Ticket} label='Điều kiện đơn' value={minOrder} />
        )}
        <DetailRow
          icon={Calendar}
          label='Thời gian áp dụng'
          value={campaignWindowLabel(campaign) || '-'}
        />
        {campaign.stackingPolicy && (
          <DetailRow
            icon={Layers}
            label='Cộng dồn ưu đãi'
            value={
              STACKING_LABEL[campaign.stackingPolicy] ?? campaign.stackingPolicy
            }
          />
        )}
      </div>

      {/* Phạm vi áp dụng — chỉ hiện khi chiến dịch thực sự giới hạn. */}
      {hasRestrictions && (
        <div className='rounded-xl border border-border/60 bg-card p-5 shadow-xs'>
          <h2 className='flex items-center gap-1.5 font-heading text-sm font-bold text-foreground'>
            <ShieldAlert className='size-4 text-warning' /> Phạm vi áp dụng
          </h2>
          {lookup.isLoading ? (
            <p className='mt-2 text-sm text-muted-foreground'>
              Đang tải điều kiện...
            </p>
          ) : (
            <div className='mt-3 space-y-3'>
              <ScopeRow
                icon={Ticket}
                label='Dịch vụ'
                names={serviceNames}
                total={campaign.applicableServiceTypeIds?.length ?? 0}
              />
              <ScopeRow
                icon={Car}
                label='Loại xe'
                names={vehicleTypeNames}
                total={campaign.applicableVehicleTypeIds?.length ?? 0}
              />
              <ScopeRow
                icon={Star}
                label='Hạng thành viên'
                names={tierNames}
                total={campaign.allowedTierIds?.length ?? 0}
              />
            </div>
          )}
        </div>
      )}

      {/* Điều khoản */}
      {campaign.terms && (
        <div className='rounded-xl border border-border/60 bg-card p-5 shadow-xs'>
          <h2 className='font-heading text-sm font-bold text-foreground'>
            Điều khoản áp dụng
          </h2>
          <p className='mt-2 whitespace-pre-line text-sm text-muted-foreground'>
            {campaign.terms}
          </p>
        </div>
      )}

      {/* Nhận voucher của chương trình này */}
      {meta.claimable && (
        <ClaimVoucherBox
          id='promotion-detail-claim-code'
          label='Có mã của chương trình? Nhập để nhận voucher vào tài khoản'
          hint='Mã do cửa hàng gửi cho bạn (tin nhắn, email hoặc tại quầy).'
        />
      )}
    </div>
  );
}

function DetailRow({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Ticket;
  label: string;
  value: string;
}) {
  return (
    <div className='flex items-center gap-3 px-5 py-4'>
      <div className='rounded-lg bg-primary/5 p-2 text-primary'>
        <Icon className='h-4 w-4' />
      </div>
      <span className='flex-1 text-sm text-muted-foreground'>{label}</span>
      <span className='text-right text-sm font-bold text-foreground'>
        {value}
      </span>
    </div>
  );
}

/**
 * Một dòng phạm vi. Mảng rỗng = KHÔNG giới hạn (theo Swagger), nên nói thẳng
 * "tất cả" thay vì để trống cho khách tự đoán.
 */
function ScopeRow({
  icon: Icon,
  label,
  names,
  total,
}: {
  icon: typeof Ticket;
  label: string;
  names: string[];
  total: number;
}) {
  const unrestricted = total === 0;
  // Có giới hạn nhưng không tra được tên (danh mục đã đổi/ẩn) — nói theo số
  // lượng, đừng in ObjectId.
  const text = unrestricted
    ? 'Tất cả'
    : names.length > 0
      ? names.join(', ')
      : `Giới hạn ${total} lựa chọn — hỏi cửa hàng để biết chi tiết`;

  return (
    <div className='flex items-start gap-3'>
      <div className='rounded-lg bg-muted p-1.5 text-muted-foreground'>
        <Icon className='h-3.5 w-3.5' />
      </div>
      <div className='min-w-0'>
        <p className='text-[11px] font-semibold uppercase tracking-wider text-muted-foreground'>
          {label}
        </p>
        <p
          className={cn(
            'text-sm',
            unrestricted
              ? 'text-muted-foreground'
              : 'font-semibold text-foreground',
          )}
        >
          {text}
        </p>
      </div>
    </div>
  );
}
