import { useQuery } from "@tanstack/react-query";
import { resources } from "../api";
import { Cpu, HardDrive, Activity, Database, Server } from "lucide-react";
import "./Resources.css";

function Resources() {
  const { data: systemData, isLoading: systemLoading } = useQuery({
    queryKey: ["resources"],
    queryFn: async () => {
      const response = await resources.getSystem();
      return response.data;
    },
    refetchInterval: 5000, // Refresh every 5 seconds
  });

  const { data: mongoData, isLoading: mongoLoading } = useQuery({
    queryKey: ["resources-mongodb"],
    queryFn: async () => {
      const response = await resources.getMongoDB();
      return response.data;
    },
    refetchInterval: 10000, // Refresh every 10 seconds
  });

  if (systemLoading || mongoLoading) {
    return <div className="loading">Yuklanmoqda...</div>;
  }

  const getUsageColor = (percent) => {
    if (percent < 50) return "#4caf50";
    if (percent < 75) return "#ff9800";
    return "#f44336";
  };

  return (
    <div className="resources-page">
      <div className="page-header">
        <h1>
          <Activity size={32} />
          Resurslar
        </h1>
        <p>Server va database monitoring</p>
      </div>

      {/* System Resources */}
      <div className="section">
        <h2>
          <Server size={24} />
          Tizim Resurslari
        </h2>
        <div className="cards-grid">
          {/* CPU Card */}
          <div className="resource-card">
            <div className="card-header">
              <Cpu size={20} />
              <h3>CPU</h3>
            </div>
            <div className="card-body">
              <div className="stat-main">{systemData?.cpu?.usage}%</div>
              <div className="stat-label">{systemData?.cpu?.model}</div>
              <div className="stat-detail">{systemData?.cpu?.cores} cores</div>
              <div className="progress-bar">
                <div
                  className="progress-fill"
                  style={{
                    width: `${systemData?.cpu?.usage}%`,
                    background: getUsageColor(systemData?.cpu?.usage),
                  }}
                ></div>
              </div>
              <div className="stat-detail mt-2">
                Load Average:{" "}
                {systemData?.cpu?.loadAverage
                  ?.map((l) => l.toFixed(2))
                  .join(", ")}
              </div>
            </div>
          </div>

          {/* Memory Card */}
          <div className="resource-card">
            <div className="card-header">
              <Activity size={20} />
              <h3>RAM</h3>
            </div>
            <div className="card-body">
              <div className="stat-main">
                {systemData?.memory?.usagePercent}%
              </div>
              <div className="stat-label">
                {systemData?.memory?.usedGB} GB / {systemData?.memory?.totalGB}{" "}
                GB
              </div>
              <div className="progress-bar">
                <div
                  className="progress-fill"
                  style={{
                    width: `${systemData?.memory?.usagePercent}%`,
                    background: getUsageColor(systemData?.memory?.usagePercent),
                  }}
                ></div>
              </div>
              <div className="stat-detail mt-2">
                Free: {systemData?.memory?.freeGB} GB
              </div>
            </div>
          </div>

          {/* Disk Card */}
          {systemData?.disk && (
            <div className="resource-card">
              <div className="card-header">
                <HardDrive size={20} />
                <h3>Disk</h3>
              </div>
              <div className="card-body">
                <div className="stat-main">
                  {systemData?.disk?.usagePercent}%
                </div>
                <div className="stat-label">
                  {systemData?.disk?.used} / {systemData?.disk?.total}
                </div>
                <div className="progress-bar">
                  <div
                    className="progress-fill"
                    style={{
                      width: `${systemData?.disk?.usagePercent}%`,
                      background: getUsageColor(systemData?.disk?.usagePercent),
                    }}
                  ></div>
                </div>
                <div className="stat-detail mt-2">
                  Available: {systemData?.disk?.available}
                </div>
              </div>
            </div>
          )}

          {/* Process Memory Card */}
          <div className="resource-card">
            <div className="card-header">
              <Activity size={20} />
              <h3>Node.js Process</h3>
            </div>
            <div className="card-body">
              <div className="stat-main">
                {systemData?.process?.memory?.rssMB} MB
              </div>
              <div className="stat-label">RSS Memory</div>
              <div className="stat-detail mt-2">
                Heap: {systemData?.process?.memory?.heapUsedMB} MB
              </div>
              <div className="stat-detail">
                Uptime: {systemData?.process?.uptimeFormatted}
              </div>
            </div>
          </div>
        </div>

        {/* System Info */}
        <div className="info-grid">
          <div className="info-item">
            <strong>Platform:</strong> {systemData?.system?.platform}
          </div>
          <div className="info-item">
            <strong>Hostname:</strong> {systemData?.system?.hostname}
          </div>
          <div className="info-item">
            <strong>Node.js:</strong> {systemData?.system?.nodeVersion}
          </div>
          <div className="info-item">
            <strong>Uptime:</strong> {systemData?.system?.uptimeFormatted}
          </div>
        </div>
      </div>

      {/* MongoDB Stats */}
      <div className="section">
        <h2>
          <Database size={24} />
          MongoDB
        </h2>
        <div className="cards-grid">
          <div className="resource-card">
            <div className="card-header">
              <Database size={20} />
              <h3>Database</h3>
            </div>
            <div className="card-body">
              <div className="stat-label">{mongoData?.database?.name}</div>
              <div className="stat-detail mt-2">
                Collections: {mongoData?.database?.collections}
              </div>
              <div className="stat-detail">
                Data Size: {mongoData?.database?.dataSizeMB} MB
              </div>
              <div className="stat-detail">
                Storage: {mongoData?.database?.storageSizeMB} MB
              </div>
              <div className="stat-detail">
                Indexes: {mongoData?.database?.indexes} (
                {mongoData?.database?.indexSizeMB} MB)
              </div>
            </div>
          </div>
        </div>

        {/* Collections */}
        <div className="collections-table">
          <h3>Collections</h3>
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Documents</th>
                <th>Size</th>
                <th>Storage</th>
                <th>Indexes</th>
              </tr>
            </thead>
            <tbody>
              {mongoData?.collections?.map((col) => (
                <tr key={col.name}>
                  <td>
                    <code>{col.name}</code>
                  </td>
                  <td>{col.count?.toLocaleString() || 0}</td>
                  <td>{col.sizeMB || "0.00"} MB</td>
                  <td>{col.storageSizeMB || "0.00"} MB</td>
                  <td>{col.indexes || 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default Resources;
