import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import {
  ArrowLeftRight,
  Send,
  Check,
  X,
  Clock,
  History,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import {
  Button,
  Input,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "~/components/ui";
import { DashboardLayout } from "~/components/layout/DashboardLayout";
import { useAuthStore } from "~/lib/auth-store";
import {
  swapsApi,
  studentsApi,
  type SwapRequest,
  type SwapHistory,
} from "~/lib/api";

export function meta() {
  return [
    { title: "Room Swaps - Hostel Allocation System" },
    { name: "description", content: "Request and manage room swaps" },
  ];
}

export default function SwapsPage() {
  const navigate = useNavigate();
  const {
    user,
    isAuthenticated,
    checkAuth,
    isLoading: authLoading,
  } = useAuthStore();

  const [myRequests, setMyRequests] = useState<SwapRequest[]>([]);
  const [incomingRequests, setIncomingRequests] = useState<SwapRequest[]>([]);
  const [swapHistory, setSwapHistory] = useState<SwapHistory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Create request form
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [targetRollNumber, setTargetRollNumber] = useState("");
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Current student info
  const [studentInfo, setStudentInfo] = useState<any>(null);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate("/login");
    } else if (!authLoading && user?.role !== "student") {
      navigate("/dashboard");
    }
  }, [isAuthenticated, authLoading, user, navigate]);

  useEffect(() => {
    if (isAuthenticated && user?.role === "student") {
      loadData();
    }
  }, [isAuthenticated, user]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [requestsRes, incomingRes, historyRes, studentRes] =
        await Promise.all([
          swapsApi.getMyRequests(),
          swapsApi.getIncoming(),
          swapsApi.getMyHistory(),
          studentsApi.getMe().catch(() => ({ data: null })),
        ]);
      setMyRequests(requestsRes.data);
      setIncomingRequests(incomingRes.data);
      setSwapHistory(historyRes.data);
      setStudentInfo(studentRes.data);
    } catch (err) {
      console.error("Error loading data:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError("");
    setSuccess("");

    try {
      // If roll number provided, find the student first
      let targetStudentId: string | undefined;
      if (targetRollNumber.trim()) {
        try {
          const studentRes = await studentsApi.findByRollNumber(
            targetRollNumber.trim(),
          );
          targetStudentId = studentRes.data?.userId;
          if (!targetStudentId) {
            setError("Student with that roll number not found");
            setIsSubmitting(false);
            return;
          }
        } catch {
          setError("Student with that roll number not found");
          setIsSubmitting(false);
          return;
        }
      }

      await swapsApi.createRequest({
        targetStudentId,
        reason: reason.trim() || undefined,
      });

      setSuccess("Swap request created successfully!");
      setShowCreateForm(false);
      setTargetRollNumber("");
      setReason("");
      loadData();
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to create swap request");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRespondToRequest = async (
    requestId: number,
    response: "accepted" | "rejected",
  ) => {
    setError("");
    setSuccess("");

    try {
      await swapsApi.respond(requestId, response);
      setSuccess(`Swap request ${response}!`);
      loadData();
    } catch (err: any) {
      setError(err.response?.data?.message || `Failed to ${response} request`);
    }
  };

  const handleCancelRequest = async (requestId: number) => {
    setError("");
    setSuccess("");

    try {
      await swapsApi.cancel(requestId);
      setSuccess("Swap request cancelled");
      loadData();
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to cancel request");
    }
  };

  if (authLoading || isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="w-8 h-8 animate-spin text-indigo-600" />
        </div>
      </DashboardLayout>
    );
  }

  const pendingRequest = myRequests.find((r) => r.status === "pending");

  return (
    <DashboardLayout>
      <div className="p-8">
        <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Room Swaps</h1>
            <p className="text-slate-600">
              Request to swap rooms with another student
            </p>
          </div>
          <Button onClick={loadData} variant="outline">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>

        {/* Error/Success Messages */}
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3 text-red-700">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span className="flex-1">{error}</span>
            <button onClick={() => setError("")}>
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
        {success && (
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3 text-green-700">
            <Check className="w-5 h-5 shrink-0" />
            <span className="flex-1">{success}</span>
            <button onClick={() => setSuccess("")}>
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Current Room Info */}
        {studentInfo?.currentRoomId && (
          <Card className="bg-indigo-50 border-indigo-200">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-indigo-100 rounded-full">
                  <ArrowLeftRight className="w-6 h-6 text-indigo-600" />
                </div>
                <div>
                  <p className="text-sm text-indigo-700 font-bold">
                    Your Current Room
                  </p>
                  <p className="text-lg font-bold text-indigo-900">
                    Room {studentInfo.currentRoom?.roomNumber || "N/A"}
                  </p>
                  <p className="text-sm text-indigo-800 font-medium">
                    {studentInfo.currentRoom?.hostel?.name || ""}
                    {studentInfo.currentRoom?.wing &&
                      ` - Wing ${studentInfo.currentRoom.wing}`}
                    {studentInfo.currentRoom?.floor &&
                      `, Floor ${studentInfo.currentRoom.floor}`}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Incoming Swap Requests */}
        {incomingRequests.length > 0 && (
          <Card className="border-yellow-200 bg-yellow-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-amber-700">
                <Clock className="w-5 h-5" />
                Incoming Swap Requests ({incomingRequests.length})
              </CardTitle>
              <CardDescription className="text-amber-800 font-medium">
                Other students want to swap rooms with you
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {incomingRequests.map((req) => (
                  <div
                    key={req.id}
                    className="p-4 bg-white rounded-lg border border-amber-200 flex items-center justify-between shadow-sm"
                  >
                    <div>
                      <p className="font-bold text-slate-900">{req.requesterName}</p>
                      <p className="text-sm text-slate-600 font-medium">
                        {req.requesterRollNumber} - Room{" "}
                        {req.requesterRoom.roomNumber} (
                        {req.requesterRoom.hostelName})
                      </p>
                      {req.reason && (
                        <p className="text-sm text-slate-700 mt-1 italic font-medium">
                          Reason: {req.reason}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() =>
                          handleRespondToRequest(req.id, "accepted")
                        }
                      >
                        <Check className="w-4 h-4 mr-1" />
                        Accept
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          handleRespondToRequest(req.id, "rejected")
                        }
                      >
                        <X className="w-4 h-4 mr-1" />
                        Decline
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Create Swap Request */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-slate-900">
              <Send className="w-5 h-5 text-indigo-600" />
              Request a Swap
            </CardTitle>
            <CardDescription className="text-slate-500">
              Send a swap request to another student
            </CardDescription>
          </CardHeader>
          <CardContent>
            {pendingRequest ? (
              <div className="p-4 bg-slate-50 rounded-lg border border-slate-100">
                <p className="text-slate-700 mb-2 font-medium">
                  You already have a pending swap request to{" "}
                  <span className="font-bold text-slate-900">
                    {pendingRequest.targetStudentName || "Open Request"}
                  </span>
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleCancelRequest(pendingRequest.id)}
                >
                  Cancel Request
                </Button>
              </div>
            ) : showCreateForm ? (
              <form onSubmit={handleCreateRequest} className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">
                    Target Student Roll Number (optional for open request)
                  </label>
                  <Input
                    placeholder="e.g., 2023CSE001"
                    value={targetRollNumber}
                    onChange={(e) => setTargetRollNumber(e.target.value)}
                  />
                  <p className="text-xs text-slate-500 mt-1 font-medium">
                    Leave empty to create an open swap request visible to all
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">
                    Reason (optional)
                  </label>
                  <Input
                    placeholder="Why do you want to swap?"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                  />
                </div>
                <div className="flex gap-2">
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4 mr-2" />
                        Send Request
                      </>
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowCreateForm(false);
                      setTargetRollNumber("");
                      setReason("");
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            ) : (
              <Button onClick={() => setShowCreateForm(true)}>
                <ArrowLeftRight className="w-4 h-4 mr-2" />
                New Swap Request
              </Button>
            )}
          </CardContent>
        </Card>

        {/* My Swap Requests */}
        <Card>
          <CardHeader>
            <CardTitle className="text-slate-900">My Swap Requests</CardTitle>
            <CardDescription className="text-slate-500">Requests you have sent</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-bold text-slate-600">
                      Target
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-bold text-slate-600">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-bold text-slate-600">
                      Created
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-bold text-slate-600">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {myRequests.map((req) => (
                    <tr key={req.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-bold text-slate-900">
                        {req.targetStudentName || (
                          <span className="text-slate-400 font-medium italic">Open Request</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-1 text-xs font-medium rounded-full ${
                            req.status === "completed"
                              ? "bg-green-100 text-green-700"
                              : req.status === "accepted"
                                ? "bg-blue-100 text-blue-700"
                                : req.status === "pending"
                                  ? "bg-yellow-100 text-yellow-700"
                                  : req.status === "rejected"
                                    ? "bg-red-100 text-red-700"
                                    : "bg-gray-100 text-gray-700"
                          }`}
                        >
                          {req.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600 font-medium">
                        {new Date(req.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3">
                        {req.status === "pending" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleCancelRequest(req.id)}
                          >
                            Cancel
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {myRequests.length === 0 && (
                <div className="text-center py-12 text-gray-500">
                  <ArrowLeftRight className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p>No swap requests yet</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Swap History */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-slate-900">
              <History className="w-5 h-5 text-indigo-600" />
              Swap History
            </CardTitle>
            <CardDescription className="text-slate-500">Your completed room swaps</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {swapHistory.map((hist) => (
                <div key={hist.id} className="p-4 hover:bg-gray-50">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-100 rounded-full">
                      <Check className="w-4 h-4 text-green-600" />
                    </div>
                    <div>
                      <p className="font-bold text-slate-900">
                        Moved from Room {hist.previousRoom?.roomNumber || "?"}{" "}
                        to Room {hist.newRoom?.roomNumber || "?"}
                      </p>
                      <p className="text-sm text-slate-600 font-medium">
                        {hist.previousRoom?.hostel?.name} →{" "}
                        {hist.newRoom?.hostel?.name}
                      </p>
                      <p className="text-xs text-slate-400 mt-1 font-medium italic">
                        {new Date(hist.executedAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
              {swapHistory.length === 0 && (
                <div className="text-center py-12 text-gray-500">
                  <History className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p>No swap history yet</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
