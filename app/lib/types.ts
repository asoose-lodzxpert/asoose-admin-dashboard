export interface User {
  id: string
  email: string
  firstName: string
  lastName: string
  phone: string
  role: string
  emailVerified: boolean
  phoneVerified: boolean
  avatar: string | null
  createdAt: string
  updatedAt: string
}

export interface ApiResponse<T = unknown> {
  success: boolean
  message: string
  data: T
}

export interface LoginData {
  accessToken: string
  refreshToken: string
  user: User
}

export interface Pagination {
  page: number
  limit: number
  total: number
  totalPages: number
}

/* ─── In-app notifications ───────────────────────────── */

export interface InAppNotification {
  id: string
  title: string
  body: string
  type: string
  isRead: boolean
  channel?: string
  referenceId: string | null
  referenceType: string | null
  data: Record<string, unknown>
  createdAt: string
}

export interface NotificationsData {
  notifications: InAppNotification[]
  unreadCount: number
  pagination: Pagination
}

/* ─── Activity timelines ──────────────────────────────── */

export type TimelineEntity = 'orders' | 'parcels' | 'rides' | 'bookings'
export type TimelineSource = 'STATUS_CHANGE' | 'WORKFLOW_UPDATE' | string

export interface TimelineEvent {
  id: string
  source: TimelineSource
  status: string | null
  previousStatus: string | null
  stage: string | null
  message: string | null
  note: string | null
  actorId: string | null
  actorRole: string | null
  actorName: string | null
  metadata: Record<string, unknown> | null
  createdAt: string
}

/* ─── Disputes ───────────────────────────────────────── */

export type DisputeStatus = 'OPEN' | 'IN_REVIEW' | 'ESCALATED' | 'CLOSED' | 'RESOLVED'
export type DisputePriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
export type DisputeResolution =
  | 'REFUND_FULL'
  | 'REFUND_PARTIAL'
  | 'REPLACEMENT'
  | 'NO_ACTION'
  | 'COMPENSATION'

export interface DisputeSummary {
  id: string
  title: string
  message: string
  category: string
  priority: DisputePriority
  status: DisputeStatus
  assignedToId: string | null
  resolution: DisputeResolution | null
  refundAmount: number | null
  resolvedAt: string | null
  createdAt: string
  updatedAt: string
}

export interface DisputeMessage {
  id: string
  senderId: string
  senderRole: string
  senderName: string
  message: string
  attachmentUrls: string[]
  isInternal: boolean
  createdAt: string
}

export interface DisputeDetail extends DisputeSummary {
  customer: {
    id: string
    firstName: string
    lastName: string
    name: string
    email: string
    phone: string
    phoneCountryCode: string | null
    avatar: string | null
    role: string
    status: string
    emailVerified: boolean
    phoneVerified: boolean
    joinedAt: string
  }
  assignedAdmin: {
    id: string
    name: string
    email: string
    role: string
  } | null
  relatedTransaction: Record<string, unknown> | null
  messages: DisputeMessage[]
}

/* ─── Configuration entities ──────────────────────────── */

export interface ConfigItem {
  id: string
  code: string
  name: string
  description: string | null
  sortOrder: number
  isActive: boolean
  createdAt: string
  updatedAt: string
  [key: string]: unknown
}

export interface VehicleType extends ConfigItem {
  appliesTo: 'DRIVER' | 'RIDER'
  icon: string | null
}

export interface VehicleBrand extends ConfigItem {
  icon: string | null
}

export interface StoreType extends ConfigItem {
  isRestaurant: boolean
  icon: string | null
}

export interface Cuisine extends ConfigItem {
  icon: string | null
}

export interface Category {
  id: string
  name: string
  slug: string
  description: string | null
  parentId: string | null
  image: string | null
  sortOrder: number
  isActive: boolean
  createdAt: string
  updatedAt: string
  [key: string]: unknown
}

/* ─── Vendors ─────────────────────────────────────────── */

export interface VendorStore {
  id: string
  name: string
  slug: string
  status: 'PENDING' | 'ACTIVE' | 'SUSPENDED' | 'CLOSED_PERMANENTLY'
  logo: string | null
  banner: string | null
  rating: number
  isOpen: boolean
  cityId: string | null
  city?: { id: string; name: string } | null
}

export interface VendorStoreDetail extends VendorStore {
  address: string | null
  preparationTime: number | null
  minOrder: number | null
  deliveryFee: number | null
  openingHours: {
    id: string
    dayOfWeek: number
    openTime: string
    closeTime: string
    isClosed: boolean
  }[]
}

export interface VendorSummary {
  id: string
  userId: string
  businessName: string
  businessType: string
  businessEmail: string
  businessPhone: string
  verificationStatus: 'PENDING' | 'VERIFIED' | 'REJECTED' | 'SUSPENDED'
  isVerified: boolean
  store: VendorStore | null
  createdAt: string
}

export interface VendorDetail {
  id: string
  userId: string
  userEmail: string | null
  businessName: string
  businessType: string
  storeTypeId: string | null
  businessDescription: string | null
  businessPhone: string | null
  businessEmail: string
  taxId: string | null
  verificationStatus: 'PENDING' | 'VERIFIED' | 'REJECTED' | 'SUSPENDED'
  isVerified: boolean
  store: VendorStoreDetail | null
  street: string | null
  city: string | null
  state: string | null
  zipCode: string | null
  country: string | null
  latitude: number | null
  longitude: number | null
  deliveryRadius: number | null
  estimatedPrepTime: number | null
  cuisineTypes: string[]
  operatingHours: unknown | null
  documents: {
    businessLicenseFile: string | null
    foodPermitFile: string | null
    taxDocumentFile: string | null
    idDocumentFile: string | null
  }
  bankDetails: {
    bankCode: string
    bankName: string
    accountName: string
    accountNumber: string
  } | null
  onboardingCompleted: boolean
  createdAt: string
  updatedAt: string
}

/* ─── Riders ──────────────────────────────────────────── */

export interface RiderSummary {
  id: string
  userId: string
  fullName: string
  email: string
  phone: string
  vehicleType: string
  status: 'ONLINE' | 'OFFLINE' | 'BUSY' | 'ON_DELIVERY' | 'ON_DELIVERY' | 'SUSPENDED'
  isVerified: boolean
  totalDeliveries: number
  rating: number
  createdAt: string
}

export interface RiderDetail {
  id: string
  userId: string
  userEmail: string | null
  userPhone: string | null
  cityId: string | null
  vehicleType: string
  vehicleBrand: string | null
  vehicleModel: string | null
  vehicleYear: number | null
  vehicleColor: string | null
  vehiclePlate: string | null
  driversLicenseNumber: string | null
  driversLicenseExpiry: string | null
  driversLicenseState: string | null
  preferredZones: string[]
  maxDeliveryDistance: number | null
  customCommissionPercent: number | null
  status: 'ONLINE' | 'OFFLINE' | 'BUSY' | 'ON_DELIVERY' | 'ON_DELIVERY' | 'SUSPENDED'
  isVerified: boolean
  currentLat: number | null
  currentLng: number | null
  totalDeliveries: number
  rating: number
  totalReviews: number
  documents: {
    profilePhoto: string | null
    driversLicenseFront: string | null
    driversLicenseBack: string | null
    vehiclePhoto: string | null
    insuranceDocument: string | null
  }
  bankDetails: {
    bankCode: string
    bankName: string
    accountName: string
    accountNumber: string
  } | null
  onboardingCompleted: boolean
  onboardingCompletedAt: string | null
  createdAt: string
  updatedAt: string
}

/* ─── Drivers ─────────────────────────────────────────── */

export interface DriverSummary {
  id: string
  userId: string
  fullName: string
  email: string
  phone: string
  vehicleType: string
  vehicleBrand: string | null
  vehicleModel: string | null
  vehiclePlate: string | null
  status: 'ONLINE' | 'OFFLINE' | 'BUSY' | 'ON_DELIVERY'
  isVerified: boolean
  totalDeliveries: number
  rating: number
  createdAt: string
}

export interface DriverDetail {
  id: string
  userId: string
  userEmail: string | null
  userPhone: string | null
  licenseNumber: string | null
  licenseExpiry: string | null
  licenseState: string | null
  vehicleType: string
  vehicleBrand: string | null
  vehicleModel: string | null
  vehicleYear: number | null
  vehicleColor: string | null
  vehiclePlate: string | null
  insuranceProvider: string | null
  insurancePolicyNumber: string | null
  insuranceExpiry: string | null
  preferredZones: string[]
  maxDeliveryDistance: number | null
  customCommissionPercent: number | null
  status: 'ONLINE' | 'OFFLINE' | 'BUSY' | 'ON_DELIVERY'
  isVerified: boolean
  currentLat: number | null
  currentLng: number | null
  totalDeliveries: number
  rating: number
  totalReviews: number
  documents: {
    profilePhoto: string | null
    driversLicenseFront: string | null
    driversLicenseBack: string | null
    vehiclePhoto: string | null
    vehicleRegistration: string | null
    insuranceDocument: string | null
    backgroundCheckConsent: boolean | null
  }
  bankDetails: {
    bankName: string
    accountNumber: string
    accountHolderName: string
    bankCode: string
  } | null
  createdAt: string
  updatedAt: string
}

/* ─── Users / Customers ───────────────────────────────── */

export type UserStatus = 'ACTIVE' | 'PENDING_VERIFICATION' | 'SUSPENDED' | 'BANNED' | 'DEACTIVATED'
export type UserRole = 'CUSTOMER' | 'VENDOR' | 'RIDER' | 'DRIVER' | 'ADMIN' | 'ADMIN_FINANCE' | 'ADMIN_SUPPORT' | 'ADMIN_MANAGER' | 'SUPER_ADMIN'

export interface CustomerSummary {
  id: string
  email: string
  firstName: string
  lastName: string
  phone: string
  role: UserRole
  status: UserStatus
  isActive: boolean
  emailVerified: boolean
  phoneVerified: boolean
  authProvider: string
  createdAt: string
  lastLoginAt: string | null
  deletedAt: string | null
}

export interface CustomerDetail extends CustomerSummary {
  phoneCountryCode: string | null
  avatar: string | null
  notificationsPreferences: { push: boolean; email: boolean; sms: boolean } | null
  cityId: string | null
  latitude: number | null
  longitude: number | null
  walletBalance: number
  lastLoginIp: string | null
  deletedAt: string | null
  updatedAt: string
}

/* ─── Cities ──────────────────────────────────────────── */

export interface City {
  id: string
  name: string
  state: string
  country: string
  isActive: boolean
}

/* ─── Products ────────────────────────────────────────── */

export interface Product {
  id: string
  vendorId: string
  storeId: string
  categoryId: string | null
  name: string
  slug: string
  description: string | null
  type: string
  basePrice: number
  price: number
  comparePrice: number | null
  sku: string | null
  images: string[]
  image: string | null
  stock: number
  status: 'ACTIVE' | 'INACTIVE' | 'DRAFT' | 'OUT_OF_STOCK'
  isActive: boolean
  isAvailable: boolean
  isFeatured: boolean
  rating: number
  totalReviews: number
  createdAt: string
  updatedAt: string
}

/* ─── Menu ────────────────────────────────────────────── */

export interface MenuChoice {
  id: string
  optionId: string
  name: string
  price: number
  isDefault: boolean
  isAvailable: boolean
}

export interface MenuOption {
  id: string
  menuItemId: string
  name: string
  required: boolean
  maxChoices: number
  minChoices: number
  choices: MenuChoice[]
}

export interface MenuItem {
  id: string
  restaurantId: string
  name: string
  description: string
  price: number
  category: string
  image: string | null
  isAvailable: boolean
  isVegetarian: boolean
  isVegan: boolean
  isGlutenFree: boolean
  spicyLevel: number
  prepTime: number | null
  calories: number | null
  createdAt: string
  updatedAt: string
  options: MenuOption[]
}

export interface VendorMenu {
  vendorId: string
  restaurantId: string
  totalItems: number
  menu: Record<string, MenuItem[]>
}

/* ─── Orders ──────────────────────────────────────────── */

export type OrderStatus =
  | 'PENDING'
  | 'PAYMENT_PENDING'
  | 'CONFIRMED'
  | 'PREPARING'
  | 'READY'
  | 'DISPATCHED'
  | 'DELIVERED'
  | 'CANCELLED'
  | 'REJECTED'
  | 'REFUNDED'
  // Legacy DB-only statuses (read-only, never transition to):
  | 'ACCEPTED'
  | 'PICKED_UP'
  | 'IN_TRANSIT'
  | 'DELIVERING'
  | 'COMPLETED'

export type PaymentStatus =
  | 'PENDING'
  | 'PROCESSING'
  | 'COMPLETED'
  | 'FAILED'
  | 'REFUNDED'
  | 'PARTIALLY_REFUNDED'

export type PaymentMethod = 'CASH' | 'CARD' | 'WALLET' | 'BANK_TRANSFER'

export interface OrderCustomer {
  id: string
  email: string
  firstName: string
  lastName: string
  phone: string
}

export interface OrderVendor {
  name: string
  image: string | null
}

export interface OrderItem {
  id: string
  name: string
  quantity: number
  price: number
  image: string | null
  instructions: string | null
}

export interface OrderPricing {
  subtotal: number
  deliveryFee: number
  serviceFee: number
  vat: number
  discount: number
  total: number
}

export interface OrderPayment {
  method: PaymentMethod
  status: PaymentStatus
  amountPaid: number
  paidAt: string | null
  reference: string
}

export interface OrderDeliveryAddress {
  label: string
  street: string
  city: string
  state: string
}

export interface OrderSummary {
  id: string
  orderNumber: string
  status: OrderStatus
  paymentMethod: PaymentMethod
  customer: OrderCustomer
  vendor: OrderVendor
  items: OrderItem[]
  pricing: OrderPricing
  payment: OrderPayment
  deliveryAddress: OrderDeliveryAddress
  deliveryStatus: string | null
  deliveryTrackingId: string | null
  estimatedDeliveryAt: string | null
  createdAt: string
}

export interface OrderDeliveryRider {
  id: string
  name: string
  phone: string
  photo: string | null
  rating: number
  vehicleType: string
  vehicleColor: string | null
  vehiclePlate: string | null
}

export interface OrderDelivery {
  id: string
  status: string
  trackingId: string | null
  rider: OrderDeliveryRider | null
}

export interface OrderDetail {
  id: string
  orderNumber: string
  status: OrderStatus
  paymentMethod: PaymentMethod
  paymentStatus: PaymentStatus
  subtotal: number
  deliveryFee: number
  serviceFee: number
  vat: number
  discount: number
  total: number
  deliveryNote: string | null
  deliveryAddressId: string | null
  restaurantId: string | null
  restaurantName: string | null
  storeId: string | null
  storeName: string | null
  items: OrderItem[]
  itemCount: number
  customer: OrderCustomer
  delivery: OrderDelivery | null
  estimatedDeliveryAt: string | null
  actualDeliveryAt: string | null
  createdAt: string
  updatedAt: string
}

/* ─── Finance / Paystack ─────────────────────────────── */

export type PaystackStatus = 'success' | 'failed' | 'abandoned'

export interface PaystackTransaction {
  id: number
  status: PaystackStatus
  reference: string
  amount: number
  currency: string
  channel: string
  paidAt: string | null
  createdAt: string
  customerEmail: string
  metadata: Record<string, unknown> | null
  gatewayResponse: string
}

/* ─── Payouts ────────────────────────────────────────── */

export type PayoutStatus =
  | 'PENDING'
  | 'APPROVED'
  | 'PROCESSING'
  | 'COMPLETED'
  | 'PAID'
  | 'REJECTED'
  | 'FAILED'
  | 'CANCELLED'

export interface PayoutSummary {
  id: string
  amount: number
  feeAmount: number
  netAmount: number
  status: PayoutStatus
  bankAccountId: string
  providerReference: string | null
  failureReason: string | null
  processedAt: string | null
  completedAt: string | null
  createdAt: string
}

/* ─── User Finance ───────────────────────────────────── */

export interface UserBankAccount {
  id: string
  userId: string
  accountNumber: string
  accountName: string
  bankCode: string
  bankName: string
  isVerified: boolean
  isDefault: boolean
  recipientCode: string | null
  createdAt: string
  updatedAt: string
}

export interface UserWallet {
  walletId: string
  balance: number
  pendingBalance: number
  lockedBalance: number
  availableBalance: number
  status: string
  pinSet: boolean
}

/* ─── Rides ───────────────────────────────────────────── */

export type RideStatus =
  | 'REQUESTED' | 'SEARCHING_DRIVER' | 'DRIVER_ASSIGNED' | 'DRIVER_ACCEPTED'
  | 'PAID' | 'IN_PROGRESS' | 'COMPLETED' | 'SCHEDULED' | 'DRIVER_ASSIGNED_SCHED'
  | 'CANCELLED_BY_USER' | 'CANCELLED_BY_DRIVER' | 'CANCELLED_BY_SYSTEM' | 'CANCELLED_SCHEDULED'
  | 'PENDING' | 'ACCEPTED' | 'ARRIVED' | 'CANCELLED'

export interface RideAddress {
  street: string
  city: string
  state: string
  latitude: number
  longitude: number
  address: string
}

export interface RideDriver {
  name: string
  vehicleType: string
  phone: string
  rating: number
}

export interface RideCustomer {
  name: string
  phone: string
  email: string
}

export interface RideSummary {
  id: string
  trackingId: string
  status: RideStatus
  fare: number
  distance: number
  paymentMethod: string
  paymentStatus: string
  isScheduled: boolean
  scheduledAt: string | null
  vehicleType: string
  bookedForOther: boolean
  passengerName: string | null
  passengerPhone: string | null
  passengerEmail: string | null
  pickupAddress: RideAddress
  dropoffAddress: RideAddress
  driver: { name: string; phone: string } | null
  createdAt: string
}

export interface RideDetail extends Omit<RideSummary, 'driver'> {
  customerId: string
  driverId: string | null
  riderId: string | null
  duration: number | null
  startedAt: string | null
  completedAt: string | null
  cancelledAt: string | null
  cancelReason: string | null
  matchingAttempts: number
  updatedAt: string
  earning: number
  customer: RideCustomer
  driver: RideDriver | null
}

/* ─── Locations / Popular Routes ─────────────────────── */

export interface CityPricing {
  id: string
  cityId: string
  cityName?: string
  baseFare: number
  perKmRate: number
  minFare: number
  maxFare: number
  serviceFeePercent: number
  serviceFeeMin: number
  serviceFeeMax: number
  vatPercent: number
  commissionPercent: number
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface PopularRoute {
  id: string
  cityId: string
  name: string
  latitude: number
  longitude: number
  maxRadiusKm: number
  maxDistanceKm: number
  fixedPrice: number
  isActive: boolean
  createdAt: string
  updatedAt: string
}

/* ─── Onboarding applications ─────────────────────────── */

export type AppTargetRole = 'VENDOR' | 'RIDER' | 'DRIVER'
export type AppStatus = 'IN_PROGRESS' | 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED'

export interface Application {
  id: string
  userId: string
  userEmail: string
  userName: string
  userPhone: string
  userRole: string
  targetRole: AppTargetRole
  status: AppStatus
  currentStep: string
  completedAt: string | null
  createdAt: string
  reviewNotes: string | null
  profile: Record<string, unknown>
  documents: Record<string, string | null>
  bankDetails: Record<string, string | null> | null
}

/* ─── Parcels ────────────────────────────────────────── */

export type ParcelStatus =
  | 'PENDING'
  | 'SEARCHING_RIDER'
  | 'RIDER_ASSIGNED'
  | 'RIDER_ACCEPTED'
  | 'PICKED_UP'
  | 'IN_TRANSIT'
  | 'DELIVERED'
  | 'CANCELLED_BY_USER'
  | 'CANCELLED_BY_RIDER'
  | 'CANCELLED_BY_SYSTEM'

export type ParcelSize = 'SMALL' | 'MEDIUM' | 'LARGE'

export interface ParcelCustomer {
  name: string
  phone: string
  email: string
}

export interface ParcelSummary {
  id: string
  trackingId: string
  status: ParcelStatus
  size: ParcelSize
  fare: number
  distance: number
  paymentMethod: string
  paymentStatus: string
  recipientName: string
  recipientPhone: string
  customer: ParcelCustomer
  pickupAddress: RideAddress
  dropoffAddress: RideAddress
  rider: { name: string; phone: string } | null
  proofOfDelivery: string | null
  createdAt: string
}

export interface ParcelDetail extends Omit<ParcelSummary, 'rider'> {
  customerId: string
  riderId: string | null
  sizeMultiplier: number
  description: string | null
  earning: number
  duration: number | null
  pickedUpAt: string | null
  deliveredAt: string | null
  cancelledAt: string | null
  cancelReason: string | null
  matchingAttempts: number
  updatedAt: string
  customer: ParcelCustomer
  rider: { name: string; phone: string; vehicleType?: string; rating?: number } | null
}

export interface ParcelPricing {
  id: string
  cityId: string
  baseFare: number
  perKmRate: number
  minFare: number
  maxFare: number
  smallMultiplier: number
  mediumMultiplier: number
  largeMultiplier: number
  commissionPercent: number
  isActive: boolean
  createdAt: string
  updatedAt: string
}

/* ─── Catalog ────────────────────────────────────────── */

export interface CatalogItem {
  id: string
  type: 'PRODUCT' | 'MENU_ITEM'
  name: string
  image: string | null
  price: number
  stock?: number
  categoryId?: string | null
  isAvailable: boolean
  isFeatured: boolean
  vendorName: string
  storefront: { id: string; name: string; kind: 'STORE' | 'RESTAURANT' }
  category: string | null
  createdAt: string
}

export interface CatalogPagination {
  page: number
  limit: number
  total: number
  totalPages: number
}

export interface StorefrontBranding {
  id: string
  kind: 'STORE' | 'RESTAURANT'
  name: string
  logo: string | null
  banner: string | null
}

/* ─── Property Types ──────────────────────────────────── */

export interface PropertyType extends ConfigItem {
  icon: string | null
}

/* ─── Properties / Room Types ─────────────────────────── */

export type PropertyStatus = 'DRAFT' | 'PUBLISHED' | 'SUSPENDED'

export interface RoomType {
  id: string
  propertyId: string
  name: string
  description: string | null
  pricePerNight: number
  quantity: number
  maxGuests: number
  images: string[]
  image: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface PropertyCity {
  id: string
  name: string
  state: string
  country: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface PropertySummary {
  id: string
  propertyTypeId: string
  propertyType: string
  name: string
  slug: string
  description: string | null
  address: string
  lat: number | null
  lng: number | null
  city: PropertyCity
  images: string[]
  image: string | null
  amenities: string[]
  checkInTime: string | null
  checkOutTime: string | null
  rating: number
  totalReviews: number
  status: PropertyStatus
  roomTypes: RoomType[]
  createdAt: string
  updatedAt: string
}

export type PropertyDetail = PropertySummary

/* ─── Bookings ─────────────────────────────────────────── */

export type BookingStatus = 'CONFIRMED' | 'CHECKED_IN' | 'CHECKED_OUT' | 'CANCELLED'

export interface BookingCustomer {
  id: string
  firstName: string
  lastName: string
  email: string
  phone: string
}

export interface BookingPropertyRef {
  id: string
  name: string
  image: string | null
  address: string
  city: { id: string; name: string }
}

export interface BookingSummary {
  id: string
  bookingNumber: string
  customerId: string
  propertyId: string
  propertyName: string
  roomTypeId: string
  roomTypeName: string
  checkIn: string
  checkOut: string
  nights: number
  unitsBooked: number
  guests: number
  pricePerNight: number
  subtotal: number
  total: number
  status: BookingStatus
  paymentMethod: string
  paymentStatus: PaymentStatus
  specialRequests: string | null
  cancellationReason: string | null
  cancelledAt: string | null
  cancelledBy: string | null
  checkedInAt: string | null
  checkedOutAt: string | null
  createdAt: string
  updatedAt: string
  customer: BookingCustomer
  property: BookingPropertyRef
}

export type BookingDetail = BookingSummary

/* ─── Reviews ─────────────────────────────────────────── */

export type ReviewSubjectType = 'VENDOR' | 'DRIVER' | 'RIDER' | 'PRODUCT' | 'ORDER' | 'PROPERTY'
export type ReviewStatus = 'PUBLISHED' | 'PENDING' | 'HIDDEN' | 'REMOVED'

export interface ReviewUser {
  id: string
  firstName: string
  lastName: string
}

export interface ReviewSubject {
  id: string
  name: string
  image: string | null
  status?: string
  rating: number
  isVerified?: boolean
}

export interface Review {
  id: string
  orderId: string | null
  userId: string
  subjectId: string
  subjectType: ReviewSubjectType
  rating: number
  comment: string | null
  tags: string[]
  status: ReviewStatus
  responseText: string | null
  respondedAt: string | null
  reportedCount: number
  helpfulCount: number
  createdAt: string
  user: ReviewUser
  subject: ReviewSubject
}
