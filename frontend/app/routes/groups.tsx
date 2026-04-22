import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import {
  Users,
  UserPlus,
  UserMinus,
  Mail,
  Check,
  X,
  Trash2,
  LogOut,
  Crown,
  UserCheck,
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
  SearchableSelect,
} from "~/components/ui";
import { DashboardLayout } from "~/components/layout/DashboardLayout";
import { useAuthStore } from "~/lib/auth-store";
import {
  groupsApi,
  adminApi,
  roommateInvitationsApi,
  type Group,
  type Invitation,
  type RoommateInvitation,
  studentsApi,
} from "~/lib/api";

export function meta() {
  return [
    { title: "My Group - Hostel Allocation System" },
    { name: "description", content: "Manage your hostel group" },
  ];
}

export default function GroupsPage() {
  const navigate = useNavigate();
  const {
    user,
    isAuthenticated,
    checkAuth,
    isLoading: authLoading,
  } = useAuthStore();
  const [myGroup, setMyGroup] = useState<Group | null>(null);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Create group form
  const [newGroupName, setNewGroupName] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  // Invite form
  const [inviteRollNumber, setInviteRollNumber] = useState("");
  const [isInviting, setIsInviting] = useState(false);

  // Roommate invitations
  const [roommateInvitations, setRoommateInvitations] = useState<RoommateInvitation[]>([]);
  const [allocationPolicy, setAllocationPolicy] = useState<string>("group_based");
  const [isSendingRoommateInvite, setIsSendingRoommateInvite] = useState(false);
  const [selectedRoommateId, setSelectedRoommateId] = useState<string>("");
  const [eligibility, setEligibility] = useState<any>(null);

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
      const [groupRes, invRes, rmInvRes, policyRes] = await Promise.all([
        groupsApi.getMyGroup(),
        groupsApi.getMyInvitations(),
        roommateInvitationsApi.getMyInvitations(),
        adminApi.getAllocationPolicy(),
        studentsApi.getMyEligibility().catch(() => ({ data: { enabled: false } })),
      ]);
      setMyGroup(groupRes.data);
      setInvitations(invRes.data);
      setRoommateInvitations(rmInvRes.data);
      setAllocationPolicy(policyRes.data.policy);
      setEligibility(eligibilityRes.data);
    } catch (err) {
      console.error("Error loading data:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName.trim()) return;

    setIsCreating(true);
    setError("");
    setSuccess("");

    try {
      await groupsApi.createGroup(newGroupName);
      setSuccess("Group created successfully!");
      setNewGroupName("");
      loadData();
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to create group");
    } finally {
      setIsCreating(false);
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteRollNumber.trim() || !myGroup) return;

    setIsInviting(true);
    setError("");
    setSuccess("");

    try {
      const res = await groupsApi.inviteMember(myGroup.id, inviteRollNumber);
      setSuccess(res.data.message);
      setInviteRollNumber("");
      loadData();
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to send invitation");
    } finally {
      setIsInviting(false);
    }
  };

  const handleRespondInvitation = async (
    groupId: number,
    status: "accepted" | "declined",
  ) => {
    setError("");
    setSuccess("");

    try {
      const res = await groupsApi.respondToInvitation(groupId, status);
      setSuccess(res.data.message);
      loadData();
    } catch (err: any) {
      setError(
        err.response?.data?.message || "Failed to respond to invitation",
      );
    }
  };

  const handleSendRoommateInvitation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRoommateId || !myGroup) return;

    const receiver = myGroup.members.find(
      (m) => m.userId === selectedRoommateId,
    );
    if (!receiver) return;

    setIsSendingRoommateInvite(true);
    setError("");
    setSuccess("");

    try {
      await roommateInvitationsApi.sendInvitation(receiver.rollNumber);
      setSuccess("Roommate invitation sent!");
      setSelectedRoommateId("");
      loadData();
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to send invitation");
    } finally {
      setIsSendingRoommateInvite(false);
    }
  };

  const handleRespondToRoommateInvitation = async (
    id: number,
    status: "accepted" | "rejected",
  ) => {
    setError("");
    setSuccess("");

    try {
      await roommateInvitationsApi.respondToInvitation(id, status);
      setSuccess(`Roommate invitation ${status}!`);
      loadData();
    } catch (err: any) {
      setError(
        err.response?.data?.message || "Failed to respond to roommate invitation",
      );
    }
  };

  const handleLeaveGroup = async () => {
    if (!confirm("Are you sure you want to leave this group?")) return;

    setError("");
    setSuccess("");

    try {
      await groupsApi.leaveGroup();
      setSuccess("You have left the group");
      loadData();
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to leave group");
    }
  };

  const handleDeleteGroup = async () => {
    if (!myGroup) return;
    if (
      !confirm(
        "Are you sure you want to delete this group? All members will be removed.",
      )
    )
      return;

    setError("");
    setSuccess("");

    try {
      await groupsApi.deleteGroup(myGroup.id);
      setSuccess("Group deleted successfully");
      loadData();
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to delete group");
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!myGroup) return;
    if (!confirm("Are you sure you want to remove this member?")) return;

    setError("");
    setSuccess("");

    try {
      await groupsApi.removeMember(myGroup.id, userId);
      setSuccess("Member removed");
      loadData();
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to remove member");
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

  if (allocationPolicy === "fcfs") {
    return (
      <DashboardLayout>
        <div className="max-w-4xl mx-auto py-8 px-4">
          <Card className="bg-amber-50  border-amber-200 ">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-amber-800  font-bold">
                <AlertCircle className="w-5 h-5" />
                Group Features Disabled
              </CardTitle>
              <CardDescription className="text-amber-700  font-medium">
                The current allocation policy is set to Individual (FCFS). Group
                formations and roommate invitations are currently disabled.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  const isCreator = myGroup?.creatorId === user?.id;

  return (
    <DashboardLayout>
      <div className="p-8">
        <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">My Group</h1>
          <p className="text-slate-600">
            Create or join a group to be allocated with your friends
          </p>
        </div>

        {/* Group Constraints Callout */}
        {eligibility?.enabled && (
          <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-xl flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
            <div className="flex-1 md:flex items-center justify-between gap-4">
              <div>
                <p className="font-bold text-indigo-900">Group Formation Constraints</p>
                <p className="text-sm text-indigo-700">
                  Based on your batch's eligible hostels, your group is restricted to a maximum of{" "}
                  <strong>{eligibility.globalMaxGroupSize} members</strong>. 
                  Individual rooms support up to <strong>{eligibility.globalMaxRoommates} roommates</strong>.
                </p>
              </div>
              <div className="mt-2 md:mt-0 flex gap-2">
                <div className="px-3 py-1 bg-white rounded-lg border border-indigo-200 text-center">
                  <p className="text-[10px] text-slate-500 uppercase font-black">Max Wing Group</p>
                  <p className="text-lg font-bold text-indigo-700 leading-tight">{eligibility.globalMaxGroupSize}</p>
                </div>
                <div className="px-3 py-1 bg-white rounded-lg border border-indigo-200 text-center">
                  <p className="text-[10px] text-slate-500 uppercase font-black">Max Roommates</p>
                  <p className="text-lg font-bold text-indigo-700 leading-tight">{eligibility.globalMaxRoommates}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
            {success}
          </div>
        )}

        {/* Pending Invitations */}
        {invitations.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="w-5 h-5" />
                Pending Invitations
              </CardTitle>
              <CardDescription>
                You have been invited to join these groups
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {invitations.map((inv) => (
                  <div
                    key={inv.groupId}
                    className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100"
                  >
                    <div>
                      <p className="font-bold text-slate-900">{inv.groupName}</p>
                      <p className="text-sm text-slate-500">
                        Invited by {inv.invitedBy}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() =>
                          handleRespondInvitation(inv.groupId, "accepted")
                        }
                      >
                        <Check className="w-4 h-4 mr-1" />
                        Accept
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          handleRespondInvitation(inv.groupId, "declined")
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

        {/* My Group or Create Group */}
        {myGroup ? (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-slate-900">
                    <Users className="w-5 h-5 text-indigo-600" />
                    {myGroup.name}
                  </CardTitle>
                  <CardDescription className="text-slate-500">
                    {myGroup.memberCount} member
                    {myGroup.memberCount !== 1 ? "s" : ""}
                  </CardDescription>
                </div>
                {isCreator ? (
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-red-600 border-red-200 hover:bg-red-50"
                    onClick={handleDeleteGroup}
                  >
                    <Trash2 className="w-4 h-4 mr-1" />
                    Delete Group
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-orange-600 border-orange-200 hover:bg-orange-50"
                    onClick={handleLeaveGroup}
                  >
                    <LogOut className="w-4 h-4 mr-1" />
                    Leave Group
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Members List */}
              <div>
                <h3 className="font-bold text-slate-900 mb-3">Members</h3>
                <div className="space-y-2">
                  {myGroup.members.map((member) => (
                    <div
                      key={member.userId}
                      className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center border border-indigo-200">
                          <span className="text-indigo-700 font-bold">
                            {member.fullName.charAt(0)}
                          </span>
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 flex items-center gap-2">
                            {member.fullName}
                            {member.userId === myGroup.creatorId && (
                              <Crown className="w-4 h-4 text-amber-500" />
                            )}
                          </p>
                          <p className="text-sm text-slate-500 font-medium">
                            {member.rollNumber}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2 py-1 text-xs rounded-full ${
                            member.status === "accepted"
                              ? "bg-green-100 text-green-700"
                              : "bg-yellow-100 text-yellow-700"
                          }`}
                        >
                          {member.status}
                        </span>
                        {isCreator && member.userId !== user?.id && (
                          <button
                            onClick={() => handleRemoveMember(member.userId)}
                            className="text-red-500 hover:text-red-700"
                          >
                            <UserMinus className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Invite Form (only for creator) */}
              {isCreator && (
                <div>
                  <h3 className="font-bold text-slate-900 mb-1">Invite Member</h3>
                  {eligibility && myGroup.members.length >= eligibility.globalMaxGroupSize ? (
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-700 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4" />
                      Group size limit reached ({eligibility.globalMaxGroupSize}). You cannot invite more members.
                    </div>
                  ) : (
                    <form onSubmit={handleInvite} className="flex gap-2">
                      <div className="flex-1 relative">
                        <UserPlus className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <Input
                          type="text"
                          placeholder="Enter roll number (e.g., 20BCE1234)"
                          value={inviteRollNumber}
                          onChange={(e) => setInviteRollNumber(e.target.value)}
                          className="pl-10"
                        />
                      </div>
                      <Button type="submit" disabled={isInviting}>
                        {isInviting ? "Sending..." : "Send Invite"}
                      </Button>
                    </form>
                  )}
                </div>
              )}

              {/* Roommate Invitation Section */}
              <div className="pt-6 border-t border-slate-200 ">
                <h3 className="font-bold text-slate-900  mb-3 flex items-center gap-2">
                  <UserCheck className="w-5 h-5 text-green-600" />
                  Preferred Roommate
                </h3>

                {roommateInvitations.find((i) => i.status === "accepted") ? (
                  <div className="p-4 bg-green-50  border border-green-100  rounded-lg flex items-center justify-between">
                    <div>
                      <p className="text-sm text-green-700  font-medium">
                        Your current preferred roommate is:
                      </p>
                      <p className="font-bold text-slate-900 ">
                        {(() => {
                          const accepted = roommateInvitations.find(
                            (i) => i.status === "accepted",
                          );
                          return accepted?.senderId === user?.id
                            ? accepted?.receiver?.fullName
                            : accepted?.sender?.fullName;
                        })()}
                      </p>
                    </div>
                    <Check className="w-6 h-6 text-green-600" />
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Send Invitation Form */}
                    <form
                      onSubmit={handleSendRoommateInvitation}
                      className="space-y-3"
                    >
                      <SearchableSelect
                        placeholder="Select from group members..."
                        options={myGroup.members
                          .filter(
                            (m) =>
                              m.userId !== user?.id && m.status === "accepted",
                          )
                          .map((m) => ({
                            id: m.userId,
                            label: m.fullName,
                            subLabel: m.rollNumber,
                          }))}
                        value={selectedRoommateId}
                        onChange={(val) => setSelectedRoommateId(val as string)}
                      />
                      <Button
                        type="submit"
                        disabled={
                          isSendingRoommateInvite || !selectedRoommateId
                        }
                        className="w-full"
                      >
                        {isSendingRoommateInvite
                          ? "Sending..."
                          : "Send Roommate Invitation"}
                      </Button>
                    </form>

                    {/* Pending Roommate Invitations */}
                    {roommateInvitations.some((i) => i.status === "pending") && (
                      <div className="space-y-2 mt-4">
                        <p className="text-sm font-bold text-slate-700 ">
                          Pending Roommate Invitations
                        </p>
                        {roommateInvitations
                          .filter((i) => i.status === "pending")
                          .map((inv) => (
                            <div
                              key={inv.id}
                              className="flex items-center justify-between p-3 bg-slate-50  rounded-lg border border-slate-100 "
                            >
                              <div>
                                <p className="text-sm font-bold text-slate-900 ">
                                  {inv.senderId === user?.id
                                    ? `To: ${inv.receiver?.fullName}`
                                    : `From: ${inv.sender?.fullName}`}
                                </p>
                                <p className="text-xs text-slate-500">
                                  {new Date(inv.createdAt).toLocaleDateString()}
                                </p>
                              </div>
                              {inv.receiverId === user?.id && (
                                <div className="flex gap-1">
                                  <Button
                                    size="sm"
                                    onClick={() =>
                                      handleRespondToRoommateInvitation(
                                        inv.id,
                                        "accepted",
                                      )
                                    }
                                  >
                                    Accept
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() =>
                                      handleRespondToRoommateInvitation(
                                        inv.id,
                                        "rejected",
                                      )
                                    }
                                  >
                                    Reject
                                  </Button>
                                </div>
                              )}
                            </div>
                          ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-slate-900">
                <Users className="w-5 h-5 text-indigo-600" />
                Create a Group
              </CardTitle>
              <CardDescription className="text-slate-500">
                Start a group to get allocated with your friends
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateGroup} className="flex gap-2">
                <div className="flex-1 relative">
                  <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <Input
                    type="text"
                    placeholder="Enter group name"
                    value={newGroupName}
                    onChange={(e) => setNewGroupName(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Button type="submit" disabled={isCreating}>
                  {isCreating ? "Creating..." : "Create Group"}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}
        </div>
      </div>
    </DashboardLayout>
  );
}
