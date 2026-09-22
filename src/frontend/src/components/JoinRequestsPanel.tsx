import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Check, Clock, Shield, UserPlus, Users, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import type { JoinRequest } from "../backend";
import {
  useApproveJoinRequest,
  useGetPendingJoinRequests,
  useGetUserDisplayName,
  useRejectJoinRequest,
} from "../hooks/useQueries";

export default function JoinRequestsPanel() {
  const { data: joinRequests = [], isLoading } = useGetPendingJoinRequests();
  const approveRequest = useApproveJoinRequest();
  const rejectRequest = useRejectJoinRequest();
  const [selectedRequest, setSelectedRequest] = useState<JoinRequest | null>(
    null,
  );
  const [actionType, setActionType] = useState<"approve" | "reject" | null>(
    null,
  );
  const [roleDialogOpen, setRoleDialogOpen] = useState(false);

  const handleApproveWithRole = async (isAdmin: boolean) => {
    if (!selectedRequest) return;

    const requestId = `${selectedRequest.user.toString()}-${selectedRequest.bookId}`;
    try {
      const result = await approveRequest.mutateAsync({ requestId, isAdmin });

      if (result.__kind__ === "ok") {
        toast.success(result.ok);
      } else {
        toast.error(result.err);
      }

      setSelectedRequest(null);
      setRoleDialogOpen(false);
    } catch (error) {
      console.error("Error approving request:", error);
      toast.error("Failed to approve join request");
    }
  };

  const handleReject = async () => {
    if (!selectedRequest) return;

    const requestId = `${selectedRequest.user.toString()}-${selectedRequest.bookId}`;
    try {
      const result = await rejectRequest.mutateAsync(requestId);

      if (result.__kind__ === "ok") {
        toast.success(result.ok);
      } else {
        toast.error(result.err);
      }

      setSelectedRequest(null);
      setActionType(null);
    } catch (error) {
      console.error("Error rejecting request:", error);
      toast.error("Failed to reject join request");
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto" />
        </CardContent>
      </Card>
    );
  }

  if (joinRequests.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Join Requests
          </CardTitle>
          <CardDescription>
            Manage pending requests from users who want to join your accounting
            books
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Clock className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No pending join requests</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Join Requests ({joinRequests.length})
          </CardTitle>
          <CardDescription>
            Review and approve or reject requests from users who want to join
            your accounting books
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {joinRequests.map((request) => (
              <JoinRequestCard
                key={`${request.user.toString()}-${request.bookId}`}
                request={request}
                onApprove={() => {
                  setSelectedRequest(request);
                  setRoleDialogOpen(true);
                }}
                onReject={() => {
                  setSelectedRequest(request);
                  setActionType("reject");
                }}
              />
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Role Assignment Dialog */}
      <Dialog open={roleDialogOpen} onOpenChange={setRoleDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign User Role</DialogTitle>
            <DialogDescription>
              Choose the role for the new member. You can change this later in
              the Book Members settings.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-4">
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => handleApproveWithRole(true)}
              disabled={approveRequest.isPending}
            >
              <Shield className="h-4 w-4 mr-2" />
              <div className="text-left flex-1">
                <div className="font-medium">Admin</div>
                <div className="text-xs text-muted-foreground">
                  Can manage members, approve requests, and delete transactions
                </div>
              </div>
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => handleApproveWithRole(false)}
              disabled={approveRequest.isPending}
            >
              <Users className="h-4 w-4 mr-2" />
              <div className="text-left flex-1">
                <div className="font-medium">Non-Admin</div>
                <div className="text-xs text-muted-foreground">
                  Can view and add data but cannot manage members
                </div>
              </div>
            </Button>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRoleDialogOpen(false)}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Confirmation Dialog */}
      <AlertDialog
        open={actionType === "reject"}
        onOpenChange={() => {
          setActionType(null);
          setSelectedRequest(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reject Join Request</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to reject this request? The user will be
              notified and the request will be removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleReject}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Reject
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function JoinRequestCard({
  request,
  onApprove,
  onReject,
}: {
  request: JoinRequest;
  onApprove: () => void;
  onReject: () => void;
}) {
  const { data: userName } = useGetUserDisplayName(request.user.toString());

  return (
    <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/30">
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <p className="font-medium">{userName || "Loading..."}</p>
          <Badge variant="outline" className="gap-1">
            <Clock className="h-3 w-3" />
            Pending
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          Book: {request.bookId.split("-")[0]}
        </p>
        <p className="text-xs text-muted-foreground font-mono mt-1">
          {request.user.toString()}
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          Requested:{" "}
          {new Date(Number(request.requestedAt) / 1000000).toLocaleString()}
        </p>
      </div>
      <div className="flex gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={onReject}
          className="gap-1 text-destructive hover:text-destructive hover:bg-destructive/10"
        >
          <X className="h-4 w-4" />
          Reject
        </Button>
        <Button size="sm" onClick={onApprove} className="gap-1">
          <Check className="h-4 w-4" />
          Approve
        </Button>
      </div>
    </div>
  );
}
