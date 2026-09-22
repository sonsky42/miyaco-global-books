import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CheckCircle, Clock, Shield, XCircle } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { ApprovalStatus, UserRole } from "../backend";
import {
  useAssignCallerUserRole,
  useGetUserDisplayName,
  useListApprovals,
  useSetApproval,
} from "../hooks/useQueries";

function UserApprovalItem({
  principal,
  status,
  onApprove,
  onReject,
  isPending,
}: {
  principal: string;
  status: ApprovalStatus;
  onApprove: () => void;
  onReject: () => void;
  isPending: boolean;
}) {
  const { data: displayName, isLoading } = useGetUserDisplayName(principal);

  return (
    <div className="flex items-center justify-between p-4 border rounded-lg">
      <div className="flex-1">
        <p className="font-semibold">
          {isLoading ? "Loading..." : displayName}
        </p>
        <p className="font-mono text-xs text-muted-foreground mt-1">
          {principal}
        </p>
        {status === ApprovalStatus.pending && (
          <Badge variant="outline" className="mt-2">
            Pending
          </Badge>
        )}
        {status === ApprovalStatus.approved && (
          <Badge className="bg-green-500 mt-2">Approved</Badge>
        )}
        {status === ApprovalStatus.rejected && (
          <Badge variant="destructive" className="mt-2">
            Rejected
          </Badge>
        )}
      </div>
      {status === ApprovalStatus.pending && (
        <div className="flex gap-2">
          <Button
            size="sm"
            onClick={onApprove}
            disabled={isPending}
            className="gap-1"
          >
            <CheckCircle className="h-4 w-4" />
            Approve
          </Button>
          <Button
            size="sm"
            variant="destructive"
            onClick={onReject}
            disabled={isPending}
            className="gap-1"
          >
            <XCircle className="h-4 w-4" />
            Reject
          </Button>
        </div>
      )}
    </div>
  );
}

export default function AdminApprovalsPage() {
  const { data: approvals, isLoading } = useListApprovals();
  const setApproval = useSetApproval();
  const assignRole = useAssignCallerUserRole();
  const [roleDialogOpen, setRoleDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [selectedRole, setSelectedRole] = useState<UserRole>(UserRole.user);

  const handleApproval = async (principal: string, status: ApprovalStatus) => {
    if (status === ApprovalStatus.approved) {
      setSelectedUser(principal);
      setRoleDialogOpen(true);
    } else {
      try {
        await setApproval.mutateAsync({
          user: principal,
          status,
        });
        toast.success("User rejected successfully");
      } catch (error) {
        console.error("Error setting approval:", error);
        toast.error("Failed to update approval status");
      }
    }
  };

  const handleRoleAssignment = async () => {
    if (!selectedUser) return;

    try {
      await setApproval.mutateAsync({
        user: selectedUser,
        status: ApprovalStatus.approved,
      });

      await assignRole.mutateAsync({
        user: selectedUser,
        role: selectedRole,
      });

      toast.success(
        `User approved as ${selectedRole === UserRole.admin ? "admin" : "non-admin"} successfully`,
      );
      setRoleDialogOpen(false);
      setSelectedUser(null);
      setSelectedRole(UserRole.user);
    } catch (error) {
      console.error("Error approving user:", error);
      toast.error("Failed to approve user");
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  const pendingApprovals =
    approvals?.filter((a) => a.status === ApprovalStatus.pending) || [];
  const approvedUsers =
    approvals?.filter((a) => a.status === ApprovalStatus.approved) || [];
  const rejectedUsers =
    approvals?.filter((a) => a.status === ApprovalStatus.rejected) || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">User Approvals</h1>
        <p className="text-muted-foreground">
          Manage user access requests and permissions
        </p>
      </div>

      {/* Pending Approvals */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-yellow-500" />
            Pending Approvals ({pendingApprovals.length})
          </CardTitle>
          <CardDescription>Users waiting for approval</CardDescription>
        </CardHeader>
        <CardContent>
          {pendingApprovals.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No pending approval requests
            </p>
          ) : (
            <div className="space-y-3">
              {pendingApprovals.map((approval) => (
                <UserApprovalItem
                  key={approval.principal.toString()}
                  principal={approval.principal.toString()}
                  status={approval.status}
                  onApprove={() =>
                    handleApproval(
                      approval.principal.toString(),
                      ApprovalStatus.approved,
                    )
                  }
                  onReject={() =>
                    handleApproval(
                      approval.principal.toString(),
                      ApprovalStatus.rejected,
                    )
                  }
                  isPending={setApproval.isPending}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Approved Users */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-500" />
            Approved Users ({approvedUsers.length})
          </CardTitle>
          <CardDescription>Users with active access</CardDescription>
        </CardHeader>
        <CardContent>
          {approvedUsers.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No approved users
            </p>
          ) : (
            <div className="space-y-2">
              {approvedUsers.map((approval) => (
                <UserApprovalItem
                  key={approval.principal.toString()}
                  principal={approval.principal.toString()}
                  status={approval.status}
                  onApprove={() => {}}
                  onReject={() => {}}
                  isPending={false}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Rejected Users */}
      {rejectedUsers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-red-500" />
              Rejected Users ({rejectedUsers.length})
            </CardTitle>
            <CardDescription>Users with denied access</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {rejectedUsers.map((approval) => (
                <UserApprovalItem
                  key={approval.principal.toString()}
                  principal={approval.principal.toString()}
                  status={approval.status}
                  onApprove={() => {}}
                  onReject={() => {}}
                  isPending={false}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Role Assignment Dialog */}
      <Dialog open={roleDialogOpen} onOpenChange={setRoleDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Assign User Role
            </DialogTitle>
            <DialogDescription>
              Choose whether this user should be an admin or non-admin member
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="role">User Role</Label>
              <Select
                value={selectedRole}
                onValueChange={(value) => setSelectedRole(value as UserRole)}
              >
                <SelectTrigger id="role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={UserRole.admin}>
                    Admin - Full access to all features
                  </SelectItem>
                  <SelectItem value={UserRole.user}>
                    Non-Admin - Standard user access
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => setRoleDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleRoleAssignment}
                disabled={assignRole.isPending || setApproval.isPending}
              >
                {assignRole.isPending || setApproval.isPending
                  ? "Approving..."
                  : "Approve User"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
