import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { greetings } from "../api";
import { CheckCircle, XCircle, Trash2, Clock } from "lucide-react";
import "./Greetings.css";

function Greetings() {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["greetings"],
    queryFn: async () => {
      const response = await greetings.getAll();
      return response.data.greetings;
    },
  });

  const approveMutation = useMutation({
    mutationFn: (id) => greetings.approve(id),
    onSuccess: () => {
      queryClient.invalidateQueries(["greetings"]);
    },
  });

  const rejectMutation = useMutation({
    mutationFn: (id) => greetings.reject(id),
    onSuccess: () => {
      queryClient.invalidateQueries(["greetings"]);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => greetings.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(["greetings"]);
    },
  });

  const handleApprove = (id) => {
    if (confirm("Tabrikni tasdiqlaysizmi?")) {
      approveMutation.mutate(id);
    }
  };

  const handleReject = (id) => {
    if (confirm("Tabrikni rad etasizmi?")) {
      rejectMutation.mutate(id);
    }
  };

  const handleDelete = (id) => {
    if (confirm("Tabrikni o'chirasizmi?")) {
      deleteMutation.mutate(id);
    }
  };

  if (isLoading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
      </div>
    );
  }

  const pendingGreetings = data?.filter((g) => g.status === "pending") || [];
  const approvedGreetings = data?.filter((g) => g.status === "approved") || [];
  const rejectedGreetings = data?.filter((g) => g.status === "rejected") || [];

  return (
    <div className="greetings-page">
      <div className="page-header">
        <h1>Tabriklar</h1>
        <p>Foydalanuvchilardan kelgan tabriklar</p>
      </div>

      <div className="greetings-tabs">
        <div className="tab active">
          <Clock size={20} />
          Kutilmoqda ({pendingGreetings.length})
        </div>
      </div>

      <div className="greetings-list">
        {pendingGreetings.map((greeting) => (
          <div key={greeting._id} className="greeting-card">
            <div className="greeting-header">
              <div className="user-badge">👤 {greeting.userId}</div>
              <span className="greeting-date">
                {new Date(greeting.createdAt).toLocaleDateString("uz-UZ")}
              </span>
            </div>

            <div className="greeting-content">
              <p>{greeting.message}</p>
            </div>

            <div className="greeting-actions">
              <button
                className="btn btn-success"
                onClick={() => handleApprove(greeting._id)}
              >
                <CheckCircle size={16} />
                Tasdiqlash
              </button>
              <button
                className="btn btn-danger"
                onClick={() => handleReject(greeting._id)}
              >
                <XCircle size={16} />
                Rad etish
              </button>
            </div>
          </div>
        ))}

        {pendingGreetings.length === 0 && (
          <div className="empty-state">
            <Clock size={48} />
            <p>Kutayotgan tabriklar yo'q</p>
          </div>
        )}
      </div>

      {(approvedGreetings.length > 0 || rejectedGreetings.length > 0) && (
        <>
          <h3 className="section-title">Bajarilgan</h3>
          <div className="greetings-list">
            {approvedGreetings.map((greeting) => (
              <div key={greeting._id} className="greeting-card approved">
                <div className="greeting-header">
                  <div className="user-badge">👤 {greeting.userId}</div>
                  <span className="badge badge-success">Tasdiqlangan</span>
                </div>
                <div className="greeting-content">
                  <p>{greeting.message}</p>
                </div>
                <button
                  className="btn-icon danger"
                  onClick={() => handleDelete(greeting._id)}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}

            {rejectedGreetings.map((greeting) => (
              <div key={greeting._id} className="greeting-card rejected">
                <div className="greeting-header">
                  <div className="user-badge">👤 {greeting.userId}</div>
                  <span className="badge badge-danger">Rad etilgan</span>
                </div>
                <div className="greeting-content">
                  <p>{greeting.message}</p>
                </div>
                <button
                  className="btn-icon danger"
                  onClick={() => handleDelete(greeting._id)}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default Greetings;
