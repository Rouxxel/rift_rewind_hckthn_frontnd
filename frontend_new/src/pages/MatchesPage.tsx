import { useNavigate } from "react-router-dom";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { MatchHistory } from "@/components/dashboard/MatchHistory";

const MatchesPage = () => {
  const navigate = useNavigate();
  return (
    <DashboardShell showBack>
      <div className="container py-6">
        <MatchHistory onBack={() => navigate("/dashboard")} />
      </div>
    </DashboardShell>
  );
};

export default MatchesPage;
