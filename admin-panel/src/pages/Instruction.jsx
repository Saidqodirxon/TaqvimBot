import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { settings } from "../api";
import { Save, FileText, Video, Link } from "lucide-react";
import "./Settings.css"; // Reuse existing styles

function Instruction() {
  const [instructionTextUz, setInstructionTextUz] = useState("");
  const [instructionTextCr, setInstructionTextCr] = useState("");
  const [instructionTextRu, setInstructionTextRu] = useState("");
  const [instructionVideo, setInstructionVideo] = useState("");

  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["settings"],
    queryFn: async () => {
      const response = await settings.getAll();
      return response.data.settings;
    },
  });

  useEffect(() => {
    if (data) {
      // Instruction settings
      const instTextSetting = data?.find((s) => s.key === "instruction_text");
      if (instTextSetting?.value) {
        setInstructionTextUz(instTextSetting.value.uz || "");
        setInstructionTextCr(instTextSetting.value.cr || "");
        setInstructionTextRu(instTextSetting.value.ru || "");
      }

      const instVideoSetting = data?.find((s) => s.key === "instruction_video");
      if (instVideoSetting) {
        setInstructionVideo(instVideoSetting.value || "");
      }
    }
  }, [data]);

  const instructionMutation = useMutation({
    mutationFn: () =>
      settings.setInstruction({
        text: {
          uz: instructionTextUz,
          cr: instructionTextCr,
          ru: instructionTextRu,
        },
        video: instructionVideo,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries(["settings"]);
      alert("Bot qo'llanmasi saqlandi!");
    },
    onError: () => {
      alert("Xatolik yuz berdi!");
    },
  });

  if (isLoading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div className="settings-page">
      <div className="page-header">
        <h1>📚 Bot Qo'llanmasi</h1>
        <p>Botdan foydalanish bo'yicha yo'riqnoma kiritish</p>
      </div>

      <div className="card">
        <div className="setting-section">
          <div className="setting-header">
            <FileText size={24} />
            <div>
              <h3>Matnli Yo'riqnoma</h3>
              <p>Har bir tilda alohida yo'riqnoma matni</p>
            </div>
          </div>

          <div className="form-group">
            <label>🇺🇿 Qo'llanma matni (O'zbekcha)</label>
            <textarea
              className="form-control"
              rows="6"
              value={instructionTextUz}
              onChange={(e) => setInstructionTextUz(e.target.value)}
              placeholder="Botdan foydalanish bo'yicha yo'riqnoma..."
            ></textarea>
          </div>

          <div className="form-group">
            <label>🇺🇿 Qo'llanma matni (O'zbekcha - Kirill)</label>
            <textarea
              className="form-control"
              rows="6"
              value={instructionTextCr}
              onChange={(e) => setInstructionTextCr(e.target.value)}
              placeholder="Ботдан фойдаланиш бўйича йўриқнома..."
            ></textarea>
          </div>

          <div className="form-group">
            <label>🇷🇺 Qo'llanma matni (Ruscha)</label>
            <textarea
              className="form-control"
              rows="6"
              value={instructionTextRu}
              onChange={(e) => setInstructionTextRu(e.target.value)}
              placeholder="Инструкция по использованию бота..."
            ></textarea>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="setting-section">
          <div className="setting-header">
            <Video size={24} />
            <div>
              <h3>Video Yo'riqnoma</h3>
              <p>YouTube link yoki Telegram video file_id</p>
            </div>
          </div>

          <div className="form-group">
            <label>🎬 Link yoki ID</label>
            <input
              type="text"
              className="form-control"
              value={instructionVideo}
              onChange={(e) => setInstructionVideo(e.target.value)}
              placeholder="https://youtube.com/watch?v=... yoki Telegram file_id"
            />
            <small className="help-text">
              💡 <b>YouTube link:</b> Matn ostida havola sifatida boradi. <br />
              💡 <b>Telegram file_id:</b> Video caption bilan birga yuboriladi.
            </small>
          </div>

          <button
            className="btn-primary"
            onClick={() => instructionMutation.mutate()}
            disabled={instructionMutation.isLoading}
            style={{ marginTop: '20px' }}
          >
            <Save size={18} />
            {instructionMutation.isLoading ? "Saqlanmoqda..." : "Qo'llanmani Saqlash"}
          </button>
        </div>
      </div>

      <div className="info-card">
        <h4>📚 Qo'llanma haqida:</h4>
        <ul>
          <li>Foydalanuvchi botdagi <b>"Qo'llanma"</b> tugmasini bosganida shu ma'lumotlar ko'rinadi.</li>
          <li><b>Lotin</b>, <b>Kirill</b> va <b>Rus</b> tillari uchun alohida kiritish tavsiya etiladi.</li>
          <li>Video ID kiritilsa, matn uning tagida (caption) bo'lib chiqadi.</li>
        </ul>
      </div>
    </div>
  );
}

export default Instruction;
