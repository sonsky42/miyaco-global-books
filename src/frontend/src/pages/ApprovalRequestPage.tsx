import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CheckCircle, Clock } from "lucide-react";
import { toast } from "sonner";
import { useRequestApproval } from "../hooks/useQueries";

export default function ApprovalRequestPage() {
  const requestApproval = useRequestApproval();

  const handleRequestApproval = async () => {
    try {
      await requestApproval.mutateAsync();
      toast.success("Approval request submitted successfully!");
    } catch (error) {
      console.error("Error requesting approval:", error);
      toast.error("Failed to submit approval request");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Clock className="h-8 w-8 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl">Approval Required</CardTitle>
          <CardDescription>
            Your account needs to be approved by an administrator before you can
            access the application
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-muted/50 rounded-lg p-4 space-y-2">
            <div className="flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <p className="font-medium">Request Approval</p>
                <p className="text-sm text-muted-foreground">
                  Submit a request to the administrator for account approval
                </p>
              </div>
            </div>
          </div>
          <Button
            onClick={handleRequestApproval}
            disabled={requestApproval.isPending}
            className="w-full"
          >
            {requestApproval.isPending ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent mr-2" />
                Submitting...
              </>
            ) : (
              "Request Approval"
            )}
          </Button>
          <p className="text-sm text-center text-muted-foreground">
            You will be notified once your request has been reviewed
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
