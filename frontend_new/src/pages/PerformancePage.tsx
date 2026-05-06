import { useNavigate } from "react-router-dom";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { PerformanceAnalysis } from "@/components/dashboard/PerformanceAnalysis";

const PerformancePage = () => {
  const navigate = useNavigate();
  return (
    <DashboardShell showBack>
      <div className="container py-6">
        <PerformanceAnalysis onBack={() => navigate("/dashboard")} />
      </div>
    </DashboardShell>
  );
};

export default PerformancePage;
