import { useNavigate } from "react-router-dom";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { GameAssets } from "@/components/dashboard/GameAssets";

const AssetsPage = () => {
  const navigate = useNavigate();
  return (
    <DashboardShell showBack>
      <div className="container py-6">
        <GameAssets onBack={() => navigate("/dashboard")} />
      </div>
    </DashboardShell>
  );
};

export default AssetsPage;
