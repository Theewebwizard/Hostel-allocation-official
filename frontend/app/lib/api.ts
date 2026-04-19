import axios from "axios";

// Use relative URLs in browser (works with Vite proxy)
// Use full URL in SSR/production if needed
const API_BASE_URL =
  typeof window !== "undefined" ? "" : "http://localhost:3000";

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("accessToken");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// Handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      if (typeof window !== "undefined") {
        localStorage.removeItem("accessToken");
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  },
);

export interface LoginDto {
  email: string;
  password: string;
}

export interface RegisterDto {
  email: string;
  password: string;
  role: "student" | "warden";
  rollNumber?: string;
  fullName?: string;
  year?: number;
  gender?: "male" | "female";
  program?: string;
}

export interface Student {
  userId: string;
  rollNumber: string;
  fullName: string;
  year: number;
  program: string;
  gender?: "male" | "female";
  applicationTimestamp?: string;
  hasSubmitted?: boolean;
  applicationStatus?: string;
}

export interface AuthResponse {
  accessToken: string;
  user: {
    id: string;
    email: string;
    role: "student" | "warden";
    student?: Student;
  };
}

export const authApi = {
  login: (data: LoginDto) => api.post<AuthResponse>("/auth/login", data),

  register: (data: RegisterDto) =>
    api.post<AuthResponse>("/auth/register", data),

  getProfile: () => api.get<AuthResponse["user"]>("/auth/profile"),
};

export const studentsApi = {
  getAll: () => api.get("/students"),
  getMe: () => api.get("/students/me"),
  findByRollNumber: (rollNumber: string) =>
    api.get(`/students/roll/${rollNumber}`),
  updateProfile: (data: {
    fullName?: string;
    year?: number;
    program?: string;
  }) => api.patch("/students/me", data),
  update: (
    userId: string,
    data: {
      rollNumber?: string;
      fullName?: string;
      year?: number;
      program?: string;
      gender?: string;
    },
  ) => api.patch(`/students/${userId}`, data),
  getEligibleForSwap: () => api.get<Student[]>("/students/eligible-for-swap"),
  submitApplication: () => api.post("/students/me/apply"),
};

// Groups API
export interface GroupMember {
  userId: string;
  rollNumber: string;
  fullName: string;
  status: string;
}

export interface Group {
  id: number;
  name: string;
  creatorId: string;
  createdAt: string;
  memberCount: number;
  members: GroupMember[];
}

export interface Invitation {
  groupId: number;
  groupName: string;
  invitedBy: string;
  invitedAt: string;
  status: string;
  policy?: string;
}

export interface AdministrativeAction {
  id: string;
  actionType: "EVICTION" | "ALLOCATION";
  performedBy: string;
  description: string;
  timestamp: string;
  snapshot: Record<string, number | null>;
  isReverted: boolean;
}

export const groupsApi = {
  createGroup: (name: string) => api.post<Group>("/groups", { name }),
  getMyGroup: () => api.get<Group | null>("/groups/me"),
  getGroupById: (id: number) => api.get<Group>(`/groups/${id}`),
  getAllGroups: () => api.get<Group[]>("/groups/all"),
  inviteMember: (groupId: number, rollNumber: string) =>
    api.post(`/groups/${groupId}/invitations`, { rollNumber }),
  removeMember: (groupId: number, userId: string) =>
    api.delete(`/groups/${groupId}/members/${userId}`),
  deleteGroup: (groupId: number) => api.delete(`/groups/${groupId}`),
  getMyInvitations: () => api.get<Invitation[]>("/groups/me/invitations"),
  respondToInvitation: (groupId: number, status: "accepted" | "declined") =>
    api.patch(`/groups/me/invitations/${groupId}`, { status }),
  leaveGroup: () => api.delete("/groups/me/leave"),
};

// Admin API
export interface Hostel {
  id: number;
  name: string;
  genderType: "male" | "female" | "co-ed";
}

export interface Room {
  id: number;
  hostelId: number;
  roomNumber: string;
  floor?: number;
  wing?: string;
  capacity: number;
  roomType: string;
  status: "available" | "maintenance";
  hostel?: Hostel;
}

export interface AllocationRule {
  id: number;
  hostelId?: number;
  year?: number;
  roomType?: string;
  isAllowed: boolean;
  priority: number;
  description?: string;
  hostel?: Hostel;
}

export interface AllocationRun {
  id: string;
  status: "queued" | "running" | "completed" | "failed";
  allocationMode?: "group_based" | "fcfs" | "wing_fcfs";
  totalStudents: number;
  allocatedStudents: number;
  averageHappiness: number;
  startTime: string;
  endTime?: string;
  errorMessage?: string;
  finalized?: boolean;
}

export interface AllocationResult {
  id: number;
  runId: string;
  studentId: string;
  roomId?: number;
  hostelName?: string;
  roomNumber?: string;
  wing?: string;
  floor?: number | string;
  groupId?: number;
  happiness: number;
  reason?: string;
  isLocked?: boolean;
  createdAt: string;
  room?: Room;
  student?: {
    fullName: string;
    rollNumber: string;
    year: number;
    program: string;
  };
}

export interface WingParticipationSetting {
  id: number;
  year: number;
  isAllowed: boolean;
}

export type AllocationPolicy = "group_based" | "fcfs" | "wing_fcfs";

export interface DashboardStats {
  totalStudents: number;
  totalGroups: number;
  studentsInGroups: number;
  totalHostels: number;
  totalRooms: number;
  totalBeds: number;
  totalRules: number;
  latestAllocationRun: AllocationRun | null;
}

export const adminApi = {
  // Dashboard
  getDashboardStats: () => api.get<DashboardStats>("/admin/dashboard"),

  // Hostels
  createHostel: (data: { name: string; genderType: string }) =>
    api.post<Hostel>("/admin/hostels", data),
  getAllHostels: () => api.get<Hostel[]>("/admin/hostels"),
  updateHostel: (id: number, data: Partial<Hostel>) =>
    api.patch<Hostel>(`/admin/hostels/${id}`, data),
  deleteHostel: (id: number) => api.delete(`/admin/hostels/${id}`),

  // Rooms
  createRoom: (data: {
    hostelId: number;
    roomNumber: string;
    floor?: number;
    wing?: string;
    capacity: number;
    roomType?: string;
  }) => api.post<Room>("/admin/rooms", data),
  bulkCreateRooms: (data: {
    hostelId: number;
    wing: string;
    floor: number;
    startRoomNumber: number;
    count: number;
    capacity: number;
    roomType?: string;
  }) => api.post<Room[]>("/admin/rooms/bulk", data),
  getAllRooms: (hostelId?: number) =>
    api.get<Room[]>("/admin/rooms", { params: { hostelId } }),
  updateRoom: (id: number, data: Partial<Room>) =>
    api.patch<Room>(`/admin/rooms/${id}`, data),
  deleteRoom: (id: number) => api.delete(`/admin/rooms/${id}`),

  // Rules
  createRule: (data: {
    hostelId?: number;
    year?: number;
    roomType?: string;
    isAllowed: boolean;
    priority: number;
    description?: string;
  }) => api.post<AllocationRule>("/admin/rules", data),
  getAllRules: () => api.get<AllocationRule[]>("/admin/rules"),
  updateRule: (id: number, data: Partial<AllocationRule>) =>
    api.patch<AllocationRule>(`/admin/rules/${id}`, data),
  deleteRule: (id: number) => api.delete(`/admin/rules/${id}`),
  getRulesMatrix: () => api.get<Record<number, {
    years: Record<number, boolean>;
    wings: Record<string, Record<number, boolean>>;
  }>>("/admin/rules/matrix"),
  saveRulesMatrix: (matrix: Record<number, {
    years: Record<number, boolean>;
    wings: Record<string, Record<number, boolean>>;
  }>) => 
    api.post("/admin/rules/matrix", { matrix }),

  // Allocation
  triggerAllocation: (data?: {
    allocationMode?: "group_based" | "fcfs" | "wing_fcfs";
    targetYears?: number[];
    targetPrograms?: string[];
  }) => api.post<AllocationRun>("/admin/allocation/run", data || {}),
  getAllocationRuns: () => api.get<AllocationRun[]>("/admin/allocation/runs"),
  getAllocationRun: (id: string) => api.get<AllocationRun>(`/admin/allocation/runs/${id}`),
  deleteAllocationRun: (id: string) => api.delete<{ message: string }>(`/admin/allocation/runs/${id}`),
  getAllocationResults: (runId: string) =>
    api.get<AllocationResult[]>(`/admin/allocation/runs/${runId}/results`),
  publishAndCommitRun: (id: string) =>
    api.post<{ message: string; count: number }>(`/admin/allocation/runs/${id}/publish`),
  updateAllocationResult: (id: number, roomId: number) =>
    api.patch<AllocationResult>(`/admin/allocation/results/${id}`, { roomId }),
  bulkEvictStudents: (rollNumbers: string[]) =>
    api.post<{ message: string; summary: any[] }>('/admin/allocation/evict-bulk', { rollNumbers }),
  resetApplicationStatus: (year?: number) =>
    api.post<{ message: string }>('/admin/allocation/reset-status', { year }),
  getAdminActions: () => api.get<AdministrativeAction[]>("/admin/logs"),
  rollbackAction: (id: string) => api.post<{ message: string }>(`/admin/logs/${id}/rollback`),

  // Wing Participation Settings
  setWingParticipation: (year: number, isAllowed: boolean) =>
    api.post<WingParticipationSetting>("/admin/wing-participation", {
      year,
      isAllowed,
    }),
  getWingParticipationSettings: () =>
    api.get<WingParticipationSetting[]>("/admin/wing-participation"),

  // Allocation Policy
  getAllocationPolicy: () =>
    api.get<{ policy: AllocationPolicy }>("/admin/policy"),
  setAllocationPolicy: (policy: AllocationPolicy) =>
    api.post<{ policy: AllocationPolicy }>("/admin/policy", { policy }),

  // Groups for Admin
  getAllGroups: () => api.get<any[]>("/admin/groups"),
  getHostelHierarchy: () => api.get<any[]>("/admin/hostels/hierarchy"),

  // Application Control
  getApplicationsEnabled: () =>
    api.get<{ enabled: boolean }>("/admin/applications-enabled"),
  setApplicationsEnabled: (enabled: boolean) =>
    api.post<{ enabled: boolean }>("/admin/applications-enabled", { enabled }),
};

export const allocationApi = {
  getMyAllocationResult: () =>
    api.get<{ result: AllocationResult; neighbors: AllocationResult[] }>(
      "/allocation-data/me",
    ),
};

// Swap System API
export interface SwapRequestRoom {
  id: number;
  roomNumber: string;
  hostelName: string;
  wing?: string;
  floor?: number;
}

export interface SwapRequest {
  id: number;
  requesterId: string;
  requesterName: string;
  requesterRollNumber: string;
  requesterRoom: SwapRequestRoom;
  targetStudentId?: string;
  targetStudentName?: string;
  targetRoom?: SwapRequestRoom;
  status:
    | "pending"
    | "accepted"
    | "rejected"
    | "cancelled"
    | "completed"
    | "expired";
  swapType: "direct" | "open" | "chain";
  reason?: string;
  createdAt: string;
  expiresAt?: string;
}

export interface SwapChainParticipant {
  studentId: string;
  studentName: string;
  currentRoomId: number;
  targetRoomId: number;
}

export interface SwapChain {
  chainId: string;
  participants: SwapChainParticipant[];
  canExecute: boolean;
  validationErrors?: string[];
}

export interface SwapHistory {
  id: number;
  studentId: string;
  previousRoom: Room;
  newRoom: Room;
  chainId?: string;
  executedAt: string;
  student?: {
    fullName: string;
    rollNumber: string;
  };
}

export const swapsApi = {
  // Student endpoints
  createRequest: (data: {
    targetStudentId?: string;
    targetRoomId?: number;
    reason?: string;
  }) => api.post<SwapRequest>("/swaps/request", data),

  getMyRequests: () => api.get<SwapRequest[]>("/swaps/my-requests"),

  getIncoming: () => api.get<SwapRequest[]>("/swaps/incoming"),

  respond: (
    id: number,
    response: "accepted" | "rejected",
    rejectionReason?: string,
  ) =>
    api.patch<SwapRequest>(`/swaps/${id}/respond`, {
      response,
      rejectionReason,
    }),

  cancel: (id: number) => api.delete<SwapRequest>(`/swaps/${id}`),

  getMyHistory: () => api.get<SwapHistory[]>("/swaps/my-history"),

  // Admin endpoints
  getAll: () => api.get<SwapRequest[]>("/swaps/admin/all"),

  detectCycles: () => api.get<SwapChain[]>("/swaps/admin/cycles"),

  executeDirect: (id: number) =>
    api.post<SwapHistory[]>(`/swaps/admin/execute/${id}`),

  executeChain: (swapRequestIds: number[]) =>
    api.post<SwapHistory[]>("/swaps/admin/execute-chain", { swapRequestIds }),

  getAllHistory: () => api.get<SwapHistory[]>("/swaps/admin/history"),
};

// Roommate Invitation API
export interface RoommateInvitation {
  id: number;
  senderId: string;
  receiverId: string;
  groupId: number;
  status: "pending" | "accepted" | "rejected" | "cancelled";
  createdAt: string;
  sender?: { fullName: string; rollNumber: string };
  receiver?: { fullName: string; rollNumber: string };
  group?: { name: string };
}

export const roommateInvitationsApi = {
  sendInvitation: (receiverRollNumber: string) =>
    api.post<RoommateInvitation>("/roommate-invitations/send", {
      receiverRollNumber,
    }),
  respondToInvitation: (id: number, status: "accepted" | "rejected") =>
    api.post<RoommateInvitation>(`/roommate-invitations/${id}/respond`, {
      status,
    }),
  getMyInvitations: () =>
    api.get<RoommateInvitation[]>("/roommate-invitations/my"),
};
