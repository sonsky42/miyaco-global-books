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
import { Shield, Trash2, UserCog, Users } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import type { AccountingBook } from "../backend";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import {
  useChangeUserRole,
  useGetBookMembersWithNames,
  useRemoveUserFromBook,
} from "../hooks/useQueries";

interface BookMembersManagerProps {
  book: AccountingBook;
}

export default function BookMembersManager({ book }: BookMembersManagerProps) {
  const { data: members = [], isLoading } = useGetBookMembersWithNames(book.id);
  const removeUser = useRemoveUserFromBook();
  const changeRole = useChangeUserRole();
  const { identity } = useInternetIdentity();
  const [removeDialogOpen, setRemoveDialogOpen] = useState(false);
  const [roleDialogOpen, setRoleDialogOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<{
    principal: string;
    name: string;
    isAdmin: boolean;
  } | null>(null);

  const isPermanentAdmin =
    identity && book.admin.toString() === identity.getPrincipal().toString();
  const isAdminMember =
    identity &&
    book.adminMembers.some(
      (admin) => admin.toString() === identity.getPrincipal().toString(),
    );

  const handleRemoveMember = async () => {
    if (!selectedMember) return;

    try {
      const result = await removeUser.mutateAsync({
        bookId: book.id,
        user: selectedMember.principal,
      });

      // Handle Result type from backend
      if (result.__kind__ === "ok") {
        toast.success(result.ok);
        setRemoveDialogOpen(false);
        setSelectedMember(null);
      } else {
        toast.error(result.err);
      }
    } catch (error: any) {
      console.error("Error removing user:", error);
      const errorMessage = error?.message || "Failed to remove user from book";
      toast.error(errorMessage);
    }
  };

  const handleChangeRole = async (makeAdmin: boolean) => {
    if (!selectedMember) return;

    try {
      const result = await changeRole.mutateAsync({
        bookId: book.id,
        user: selectedMember.principal,
        makeAdmin,
      });

      // Handle Result type from backend
      if (result.__kind__ === "ok") {
        toast.success(result.ok);
        setRoleDialogOpen(false);
        setSelectedMember(null);
      } else {
        toast.error(result.err);
      }
    } catch (error: any) {
      console.error("Error changing user role:", error);
      const errorMessage = error?.message || "Failed to change user role";
      toast.error(errorMessage);
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

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            {book.name} - Members ({members.length})
          </CardTitle>
          <CardDescription>
            {isPermanentAdmin
              ? "As the permanent admin (book creator), you can change roles and remove any member except yourself."
              : isAdminMember
                ? "As an admin, you can remove members, but only the permanent admin can change roles."
                : "View members of this accounting book."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {members.map(([principal, name, isMemberAdmin]) => {
              const isPermanentAdminMember =
                principal.toString() === book.admin.toString();
              const isCurrentUser =
                identity &&
                principal.toString() === identity.getPrincipal().toString();

              return (
                <div
                  key={principal.toString()}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{name}</p>
                      {isPermanentAdminMember && (
                        <Badge variant="outline" className="gap-1">
                          <Shield className="h-3 w-3" />
                          Permanent Admin
                        </Badge>
                      )}
                      {isMemberAdmin && !isPermanentAdminMember && (
                        <Badge variant="secondary" className="gap-1">
                          <Shield className="h-3 w-3" />
                          Admin
                        </Badge>
                      )}
                      {isCurrentUser && <Badge variant="secondary">You</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground font-mono mt-1">
                      {principal.toString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {/* Only permanent admin can change roles */}
                    {isPermanentAdmin &&
                      !isPermanentAdminMember &&
                      !isCurrentUser && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setSelectedMember({
                              principal: principal.toString(),
                              name,
                              isAdmin: isMemberAdmin,
                            });
                            setRoleDialogOpen(true);
                          }}
                          className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                          title="Change user role"
                        >
                          <UserCog className="h-4 w-4" />
                        </Button>
                      )}
                    {/* Only permanent admin can remove users (cannot remove themselves) */}
                    {isPermanentAdmin &&
                      !isPermanentAdminMember &&
                      !isCurrentUser && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setSelectedMember({
                              principal: principal.toString(),
                              name,
                              isAdmin: isMemberAdmin,
                            });
                            setRemoveDialogOpen(true);
                          }}
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          title="Remove user from book"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={removeDialogOpen} onOpenChange={setRemoveDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove User from Book</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove{" "}
              <strong>{selectedMember?.name}</strong> from this accounting book?
              They will lose access to all data in this book and must send a new
              join request to rejoin.
              {selectedMember?.isAdmin && (
                <span className="block mt-2 text-amber-600 font-medium">
                  Note: This user is currently an admin and will lose admin
                  privileges.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={removeUser.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemoveMember}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={removeUser.isPending}
            >
              {removeUser.isPending ? "Removing..." : "Remove User"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={roleDialogOpen} onOpenChange={setRoleDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change User Role</DialogTitle>
            <DialogDescription>
              Change the role for <strong>{selectedMember?.name}</strong>.
              <br />
              Current role:{" "}
              <strong>{selectedMember?.isAdmin ? "Admin" : "Non-Admin"}</strong>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-4">
            <Button
              variant={selectedMember?.isAdmin ? "outline" : "default"}
              className="w-full"
              onClick={() => handleChangeRole(true)}
              disabled={selectedMember?.isAdmin || changeRole.isPending}
            >
              <Shield className="h-4 w-4 mr-2" />
              {selectedMember?.isAdmin ? "Already Admin" : "Promote to Admin"}
            </Button>
            <Button
              variant={!selectedMember?.isAdmin ? "outline" : "default"}
              className="w-full"
              onClick={() => handleChangeRole(false)}
              disabled={!selectedMember?.isAdmin || changeRole.isPending}
            >
              <Users className="h-4 w-4 mr-2" />
              {!selectedMember?.isAdmin
                ? "Already Non-Admin"
                : "Demote to Non-Admin"}
            </Button>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRoleDialogOpen(false)}
              disabled={changeRole.isPending}
            >
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
