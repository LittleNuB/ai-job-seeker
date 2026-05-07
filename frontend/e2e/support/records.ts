import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import path from "node:path";

export interface SeededAnalysisRecord {
  recordId: string;
  recordType: "jd" | "match";
  summary: string;
}

const repoRoot = path.resolve(__dirname, "../../..");

function getPythonPath(): string {
  return process.env.E2E_PYTHON || path.join(repoRoot, "backend", ".venv", "Scripts", "python.exe");
}

function getSqliteDbPath(): string {
  return process.env.E2E_SQLITE_DB || path.join(repoRoot, "data", "ai_job_copilot.db");
}

function insertRecord(
  userId: string,
  recordType: "jd" | "match",
  inputText: string,
  resultJson: string,
  matchScore: number | null,
): string {
  const recordId = randomUUID();
  const script = `
import sqlite3
import sys

db_path, user_id, record_id, record_type, input_text, result_json, match_score = sys.argv[1:8]

with sqlite3.connect(db_path) as conn:
    conn.execute(
        "insert into analysis_records (id, user_id, type, input_text, result, match_score) values (?, ?, ?, ?, ?, ?)",
        (record_id, user_id, record_type, input_text, result_json, int(match_score) if match_score != "None" else None),
    )
    conn.commit()
`;

  execFileSync(
    getPythonPath(),
    [
      "-c",
      script,
      getSqliteDbPath(),
      userId,
      recordId,
      recordType,
      inputText,
      resultJson,
      matchScore === null ? "None" : String(matchScore),
    ],
    { cwd: repoRoot, stdio: "pipe" },
  );

  return recordId;
}

export function seedJdRecord(userId: string): SeededAnalysisRecord {
  const recordId = insertRecord(
    userId,
    "jd",
    "E2E JD input text for testing record deletion",
    JSON.stringify({
      position_overview: { inferred_role: "E2E 测试岗位", seniority_level: "高级", company_type_hint: "互联网" },
      surface_requirements: { hard_skills: ["Python", "FastAPI"], soft_skills: ["沟通能力"], experience: ["3年"], education: ["本科"] },
      hidden_needs: { team_context: "测试团队", real_priorities: ["性能优化"], culture_signals: [], why_this_role: "E2E测试" },
      interview_focus: { likely_topics: [], red_flags: [], standout_angles: [] },
    }),
    null,
  );

  return { recordId, recordType: "jd", summary: "E2E 测试岗位" };
}

export function seedMatchRecord(userId: string): SeededAnalysisRecord {
  const recordId = insertRecord(
    userId,
    "match",
    "E2E match input text for testing record deletion",
    JSON.stringify({
      match_score: 78,
      result: {
        match_score: 78,
        score_breakdown: { hard_skills_match: 80, experience_match: 75, culture_fit: 70, growth_potential: 85 },
        core_advantages: [{ advantage: "技术匹配度高", evidence: "具备 FastAPI 项目经验" }],
        capability_gaps: [{ gap: "缺少 Kubernetes 经验", severity: "中", mitigation: "建议学习 K8s 基础" }],
        improvement_plan: { immediate: ["准备技术面试"], short_term: ["学习云原生"], medium_term: ["获得认证"] },
      },
    }),
    78,
  );

  return { recordId, recordType: "match", summary: "匹配得分：78/100" };
}
