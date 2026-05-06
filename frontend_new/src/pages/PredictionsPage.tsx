import { useNavigate } from "react-router-dom";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { Predictions } from "@/components/dashboard/Predictions";

const PredictionsPage = () => {
  const navigate = useNavigate();
  return (
    <DashboardShell showBack>
      <div className="container py-6">
        <Predictions onBack={() => navigate("/dashboard")} />
      </div>
    </DashboardShell>
  );
};

export default PredictionsPage;
