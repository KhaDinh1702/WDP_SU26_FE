'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Car,
  Bike,
  Plus,
  Check,
  Trash2,
  Pencil,
  AlertTriangle,
  X,
  Star,
  History
} from 'lucide-react';
import { Spinner } from '@/components/ui/spinner';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formatLicensePlate, capitalizeWords } from '@/lib/format';
import { getErrorMessage } from '@/lib/getErrorMessage';
import { 
  getMyVehicles, 
  createVehicle, 
  updateVehicle, 
  deleteVehicle, 
  setDefaultVehicle, 
  getActiveVehicleTypes 
} from '@/lib/customer-api';

interface VehicleType {
  id?: string;
  _id?: string;
  name: string;
  description?: string;
}

interface Vehicle {
  id?: string;
  _id?: string;
  vehicleTypeId: string;
  licensePlate: string;
  nickname?: string;
  brand?: string;
  model?: string;
  color?: string;
  isDefault: boolean;
}

export default function VehicleManagement() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [vehicleTypes, setVehicleTypes] = useState<VehicleType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isSubmitLoading, setIsSubmitLoading] = useState(false);
  const [settingDefaultId, setSettingDefaultId] = useState<string | null>(null);
  
  // Modal states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);

  // Form states
  const [formData, setFormData] = useState({
    vehicleTypeId: '',
    licensePlate: '',
    nickname: '',
    brand: '',
    model: '',
    color: '',
    isDefault: false
  });

  // Fetch all vehicles and vehicle types on mount
  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setIsLoading(true);
    setLoadError(null);
    try {
      const [vehiclesRes, typesRes] = await Promise.all([
        getMyVehicles(),
        getActiveVehicleTypes()
      ]);
      const vData = vehiclesRes.data?.data || vehiclesRes.data || [];
      const tData = typesRes.data?.data || typesRes.data || [];
      setVehicles(Array.isArray(vData) ? vData : []);
      setVehicleTypes(Array.isArray(tData) ? tData : []);
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      console.error('Lỗi khi tải dữ liệu xe:', err);
      const message = getErrorMessage(error);
      setLoadError(message);
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenAddModal = () => {
    setSelectedVehicle(null);
    setFormData({
      vehicleTypeId: vehicleTypes[0]?._id || vehicleTypes[0]?.id || '',
      licensePlate: '',
      nickname: '',
      brand: '',
      model: '',
      color: '',
      isDefault: vehicles.length === 0 // Auto-default if it's the first vehicle
    });
    setIsFormOpen(true);
  };

  const handleOpenEditModal = (vehicle: Vehicle) => {
    setSelectedVehicle(vehicle);
    setFormData({
      vehicleTypeId: vehicle.vehicleTypeId,
      licensePlate: vehicle.licensePlate,
      nickname: vehicle.nickname || '',
      brand: vehicle.brand || '',
      model: vehicle.model || '',
      color: vehicle.color || '',
      isDefault: vehicle.isDefault
    });
    setIsFormOpen(true);
  };

  const handleOpenDeleteModal = (vehicle: Vehicle) => {
    setSelectedVehicle(vehicle);
    setIsDeleteOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.vehicleTypeId) {
      toast.warning('Vui lòng chọn loại xe');
      return;
    }
    if (!formData.licensePlate.trim()) {
      toast.warning('Vui lòng nhập biển số xe');
      return;
    }

    setIsSubmitLoading(true);
    try {
      if (selectedVehicle) {
        // Update vehicle
        await updateVehicle(selectedVehicle._id || selectedVehicle.id || '', {
          vehicleTypeId: formData.vehicleTypeId,
          licensePlate: formData.licensePlate.trim().toUpperCase(),
          nickname: formData.nickname.trim() || undefined,
          brand: formData.brand.trim() || undefined,
          model: formData.model.trim() || undefined,
          color: formData.color.trim() || undefined,
        });
        toast.success('Cập nhật thông tin xe thành công!');
      } else {
        // Create vehicle
        await createVehicle({
          vehicleTypeId: formData.vehicleTypeId,
          licensePlate: formData.licensePlate.trim().toUpperCase(),
          nickname: formData.nickname.trim() || undefined,
          brand: formData.brand.trim() || undefined,
          model: formData.model.trim() || undefined,
          color: formData.color.trim() || undefined,
          isDefault: formData.isDefault
        });
        toast.success('Thêm phương tiện mới thành công!');
      }
      setIsFormOpen(false);
      await fetchData();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      console.error('Lỗi lưu xe:', err);
      toast.error(getErrorMessage(error));
    } finally {
      setIsSubmitLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedVehicle) return;
    setIsSubmitLoading(true);
    try {
      await deleteVehicle(selectedVehicle._id || selectedVehicle.id || '');
      toast.success('Đã xóa phương tiện thành công!');
      setIsDeleteOpen(false);
      await fetchData();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      console.error('Lỗi xóa xe:', err);
      toast.error('Không thể xóa phương tiện.', { description: getErrorMessage(error) });
    } finally {
      setIsSubmitLoading(false);
    }
  };

  const handleSetDefault = async (id: string) => {
    setSettingDefaultId(id);
    try {
      await setDefaultVehicle(id);
      toast.success('Đã đặt làm phương tiện mặc định!');
      await fetchData();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      console.error('Lỗi cài đặt mặc định:', err);
      toast.error('Không thể đặt xe mặc định.', { description: getErrorMessage(error) });
    } finally {
      setSettingDefaultId(null);
    }
  };

  // Tên loại xe hiển thị tiếng Việt (dữ liệu BE đang lưu tên tiếng Anh).
  const VEHICLE_TYPE_VI: Record<string, string> = {
    car: 'Ô tô',
    motorbike: 'Xe máy',
  };
  const getTypeName = (typeId: string): string => {
    if (!typeId) return 'Chưa phân loại';
    const found = vehicleTypes.find(t => (t._id || t.id) === typeId);
    if (!found?.name) return 'Chưa phân loại';
    return VEHICLE_TYPE_VI[found.name.toLowerCase()] || found.name;
  };

  // Helper to render beautiful license plate
  const renderLicensePlate = (plate: string) => {
    return (
      <div className="inline-flex flex-col items-center justify-center border-2 border-border rounded-lg px-4 py-1.5 bg-muted/40 shadow-xs min-w-35 text-center font-mono">
        <div className="w-full border-b border-border text-[9px] tracking-wider text-placeholder font-sans pb-0.5 leading-none">VIỆT NAM</div>
        <span className="text-sm font-bold text-foreground tracking-wide pt-0.5 leading-none">{formatLicensePlate(plate)}</span>
      </div>
    );
  };

  return (
    <div className='space-y-6'>
      {/* Header section */}
      <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border pb-4'>
        <div>
          <h1 className='font-heading text-xl font-bold text-foreground'>Xe của tôi</h1>
          <p className='text-sm text-muted-foreground'>
            {isLoading
              ? 'Quản lý danh sách phương tiện để đặt lịch nhanh hơn'
              : `${vehicles.length} phương tiện đã lưu — dùng để đặt lịch nhanh hơn`}
          </p>
        </div>
        <Button
          onClick={handleOpenAddModal}
          className='flex items-center gap-2 rounded-xl bg-primary px-5 py-3 font-semibold text-primary-foreground shadow-[0_12px_28px_-18px_rgba(37,78,180,0.75)] transition-all hover:-translate-y-0.5 hover:bg-primary/90 active:translate-y-0'
        >
          <Plus className='w-4 h-4' />
          Thêm phương tiện
        </Button>
      </div>

      {/* Main Content */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <Spinner className="size-10 text-primary" />
          <span className="text-muted-foreground text-sm">Đang tải danh sách xe...</span>
        </div>
      ) : loadError ? (
        <div className='flex min-h-64 flex-col items-center justify-center rounded-2xl border border-destructive/20 bg-destructive/5 px-6 py-12 text-center'>
          <span className='mb-4 flex size-12 items-center justify-center rounded-xl bg-destructive/10 text-destructive'>
            <AlertTriangle className='size-6' />
          </span>
          <h3 className='font-heading text-lg font-bold text-foreground'>
            Chưa thể tải danh sách xe
          </h3>
          <p className='mt-1 max-w-md text-sm leading-6 text-muted-foreground'>
            {loadError}
          </p>
          <Button onClick={fetchData} variant='outline' className='mt-5 rounded-xl'>
            Thử tải lại
          </Button>
        </div>
      ) : vehicles.length === 0 ? (
        <Card className='rounded-2xl border-2 border-dashed border-border/60 bg-card/60 py-16 text-center shadow-none'>
          <CardContent className="flex flex-col items-center justify-center gap-4">
            <div className="p-4 rounded-full bg-primary/10 text-primary">
              <Car className="w-12 h-12" />
            </div>
            <div className="space-y-1">
              <h3 className="font-heading text-lg font-bold text-foreground">Chưa có phương tiện nào</h3>
              <p className="text-sm text-muted-foreground max-w-sm">
                Thêm thông tin xe giúp chúng tôi gợi ý dịch vụ phù hợp và rút ngắn thời gian đặt lịch rửa xe của bạn.
              </p>
            </div>
            <Button
              onClick={handleOpenAddModal}
              variant="outline"
              className="mt-2 rounded-xl border-primary text-primary hover:bg-primary hover:text-white transition-all font-semibold"
            >
              Thêm phương tiện ngay
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className='grid grid-cols-1 gap-5 xl:grid-cols-2'>
          {vehicles.map((vehicle) => {
            const typeName = getTypeName(vehicle.vehicleTypeId).toLowerCase();
            const isMotorbike = typeName.includes('motor') || typeName.includes('xe máy');
            const vId = vehicle._id || vehicle.id || '';
            
            return (
              <Card
                key={vId}
                className={`group relative gap-0 overflow-hidden rounded-2xl border bg-card py-0 shadow-[0_12px_35px_-28px_rgba(30,58,138,0.55)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_20px_45px_-28px_rgba(30,58,138,0.55)] ${
                  vehicle.isDefault
                    ? 'border-primary/30 ring-1 ring-primary/10'
                    : 'border-border/80'
                }`}
              >
                {vehicle.isDefault && (
                  <div className='absolute inset-x-0 top-0 h-0.5 bg-primary' />
                )}
                <CardContent className='flex h-full min-h-[280px] flex-col p-5'>
                  <div className='flex-1'>
                    {/* Header info card */}
                    <div className='mb-5 flex items-start gap-3'>
                      <div className={`flex size-11 shrink-0 items-center justify-center rounded-xl ${
                          vehicle.isDefault ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
                        }`}>
                          {isMotorbike ? <Bike className="w-5 h-5" /> : <Car className="w-5 h-5" />}
                      </div>
                      <div className='min-w-0 flex-1'>
                          <h4 className='flex flex-wrap items-center gap-2 font-heading text-base font-bold text-foreground'>
                            {capitalizeWords(vehicle.nickname || vehicle.brand) || 'Xe của tôi'}
                            {vehicle.isDefault && (
                              <span className='inline-flex items-center gap-1 rounded-md border border-primary/15 bg-primary/[0.08] px-2 py-0.5 text-[10px] font-bold text-primary'>
                                <Check className="w-3 h-3" /> Xe mặc định
                              </span>
                            )}
                          </h4>
                          <span className="text-xs text-muted-foreground font-medium">
                            {getTypeName(vehicle.vehicleTypeId)}
                            {(vehicle.brand || vehicle.model) && (
                              <> · {capitalizeWords([vehicle.brand, vehicle.model].filter(Boolean).join(' '))}</>
                            )}
                          </span>
                      </div>
                    </div>

                    {/* Middle details */}
                    <div className='grid grid-cols-[auto_minmax(0,1fr)] items-center gap-4 rounded-xl bg-muted/35 p-3'>
                      {renderLicensePlate(vehicle.licensePlate)}
                      <dl className='min-w-0 text-xs'>
                        <dt className='font-medium text-muted-foreground'>Màu sắc</dt>
                        <dd className='truncate font-semibold text-foreground'>
                          {vehicle.color ? capitalizeWords(vehicle.color) : 'Chưa cập nhật'}
                        </dd>
                      </dl>
                    </div>
                  </div>

                  {/* Actions footer */}
                  <div className='mt-5 grid grid-cols-2 gap-2 border-t border-border/70 pt-4'>
                    <Link
                      href={`/profile/orders?q=${encodeURIComponent(vehicle.licensePlate)}`}
                      className='inline-flex h-9 items-center justify-center rounded-lg bg-muted/60 px-3 text-xs font-semibold text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50'
                    >
                      <History className='mr-1.5 size-3.5' />
                      Lịch sử rửa
                    </Link>
                    <Button
                      size='sm'
                      variant='ghost'
                      disabled={vehicle.isDefault || settingDefaultId === vId}
                      onClick={() => handleSetDefault(vId)}
                      className='h-9 rounded-lg px-3 text-xs font-semibold text-primary hover:bg-primary/10 hover:text-primary disabled:opacity-65'
                    >
                      {vehicle.isDefault ? (
                        <Check className='mr-1.5 size-3.5' />
                      ) : settingDefaultId === vId ? (
                        <Spinner className='mr-1.5 size-3.5' />
                      ) : (
                        <Star className='mr-1.5 size-3.5' />
                      )}
                      {vehicle.isDefault ? 'Đang mặc định' : 'Đặt mặc định'}
                    </Button>
                      <Button
                        size='sm'
                        variant='outline'
                        onClick={() => handleOpenEditModal(vehicle)}
                        className='h-9 rounded-lg px-3 text-xs font-semibold'
                      >
                        <Pencil className='mr-1.5 size-3.5' />
                        Sửa
                      </Button>
                      <Button
                        size='sm'
                        variant='outline'
                        onClick={() => handleOpenDeleteModal(vehicle)}
                        className='h-9 rounded-lg border-destructive/25 px-3 text-xs font-semibold text-destructive hover:bg-destructive/10 hover:text-destructive'
                      >
                        <Trash2 className='mr-1.5 size-3.5' />
                        Xóa
                      </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Add / Edit Form Modal */}
      {isFormOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <Card className="max-h-[calc(100dvh-2rem)] w-full max-w-lg gap-0 overflow-y-auto rounded-xl border-none bg-card py-0 shadow-2xl animate-in zoom-in-95 duration-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between border-b border-border pb-4 mb-6">
                <h3 className="font-heading text-lg font-bold text-foreground">
                  {selectedVehicle ? 'Cập nhật phương tiện' : 'Thêm phương tiện mới'}
                </h3>
                <button 
                  onClick={() => setIsFormOpen(false)}
                  className="p-1 rounded-lg hover:bg-muted text-placeholder hover:text-muted-foreground transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleFormSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5 col-span-2 sm:col-span-1">
                    <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Biển số xe *</Label>
                    <Input
                      required
                      placeholder="VD: 51A-12345"
                      value={formData.licensePlate}
                      onChange={(e) => setFormData({ ...formData, licensePlate: e.target.value })}
                      className="rounded-xl border-border/50 bg-background transition-all focus:bg-card uppercase placeholder:normal-case font-mono font-bold"
                    />
                  </div>

                  <div className="space-y-1.5 col-span-2 sm:col-span-1">
                    <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Loại xe *</Label>
                    <select
                      value={formData.vehicleTypeId}
                      onChange={(e) => setFormData({ ...formData, vehicleTypeId: e.target.value })}
                      className="w-full h-10 px-3 rounded-xl border border-border/50 bg-background focus:bg-card focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all text-sm"
                    >
                      {vehicleTypes.map((type) => {
                        const typeId = type._id || type.id;
                        return (
                          <option key={typeId} value={typeId}>
                            {type.name}
                          </option>
                        );
                      })}
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Tên gọi / Biệt danh (không bắt buộc)</Label>
                  <Input
                    placeholder="VD: Xe đi làm, Xe đi phượt..."
                    value={formData.nickname}
                    onChange={(e) => setFormData({ ...formData, nickname: e.target.value })}
                    className="rounded-xl border-border/50 bg-background focus:bg-card transition-all"
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-1.5 col-span-3 sm:col-span-1">
                    <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Hãng xe</Label>
                    <Input
                      placeholder="VD: Honda, Toyota"
                      value={formData.brand}
                      onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                      className="rounded-xl border-border/50 bg-background focus:bg-card transition-all"
                    />
                  </div>

                  <div className="space-y-1.5 col-span-3 sm:col-span-1">
                    <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Dòng xe</Label>
                    <Input
                      placeholder="VD: SH, Wave, Vios"
                      value={formData.model}
                      onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                      className="rounded-xl border-border/50 bg-background focus:bg-card transition-all"
                    />
                  </div>

                  <div className="space-y-1.5 col-span-3 sm:col-span-1">
                    <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Màu sắc</Label>
                    <Input
                      placeholder="VD: Đỏ, Trắng, Đen"
                      value={formData.color}
                      onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                      className="rounded-xl border-border/50 bg-background focus:bg-card transition-all"
                    />
                  </div>
                </div>

                {!selectedVehicle && vehicles.length > 0 && (
                  <div className="flex items-center gap-2 pt-2">
                    <input
                      type="checkbox"
                      id="isDefaultCheckbox"
                      checked={formData.isDefault}
                      onChange={(e) => setFormData({ ...formData, isDefault: e.target.checked })}
                      className="rounded border-border text-primary focus:ring-primary w-4 h-4 cursor-pointer"
                    />
                    <label htmlFor="isDefaultCheckbox" className="text-sm font-semibold text-muted-foreground cursor-pointer select-none">
                      Đặt làm phương tiện mặc định
                    </label>
                  </div>
                )}

                <div className="flex justify-end gap-3 pt-6 border-t border-border mt-6">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsFormOpen(false)}
                    className="rounded-xl px-5 py-2.5 font-semibold"
                    disabled={isSubmitLoading}
                  >
                    Hủy
                  </Button>
                  <Button
                    type="submit"
                    className="bg-primary hover:bg-primary/90 text-white rounded-xl px-6 py-2.5 font-semibold shadow-lg min-w-[120px]"
                    disabled={isSubmitLoading}
                  >
                    {isSubmitLoading ? <Spinner className="size-5 mx-auto" /> : 'Lưu lại'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteOpen && selectedVehicle && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <Card className="w-full max-w-md border-none shadow-2xl rounded-xl overflow-hidden bg-card py-0 gap-0 animate-in zoom-in-95 duration-200">
            <CardContent className="p-6">
              <div className="flex items-start gap-4 mb-4">
                <div className="p-3 rounded-full bg-destructive/10 text-destructive">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <div className="space-y-1 flex-1">
                  <h3 className="font-heading text-lg font-bold text-foreground">Xóa phương tiện</h3>
                  <p className="text-sm text-muted-foreground">
                    Bạn có chắc chắn muốn xóa phương tiện có biển số{' '}
                    <span className="font-mono font-bold text-foreground">{selectedVehicle.licensePlate}</span> không?
                  </p>
                  <p className="text-xs text-destructive font-medium">Hành động này không thể hoàn tác và phương tiện sẽ không dùng để đặt lịch mới được nữa.</p>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-border">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsDeleteOpen(false)}
                  className="rounded-xl px-4 py-2 font-semibold"
                  disabled={isSubmitLoading}
                >
                  Hủy bỏ
                </Button>
                <Button
                  onClick={handleDelete}
                  className="bg-destructive hover:bg-destructive/90 text-white rounded-xl px-5 py-2 font-semibold shadow-lg min-w-25"
                  disabled={isSubmitLoading}
                >
                  {isSubmitLoading ? <Spinner className="size-5 mx-auto" /> : 'Đồng ý xóa'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
