# AI Job Copilot

AI Job Copilot helps a candidate turn ordinary, under-described experience into the strongest job-specific story they can comfortably explain in an interview. Candidate-provided statements are accepted as the working premise; the product does not ask for external proof or perform background checks.

## Language

**Target Application**:
One bounded preparation task for a concrete job description. A role title or generic position profile may provide browsing context but cannot start the P0 Claim Studio without JD text.
_Avoid_: Generic role analysis, career plan, path, role prediction

**Initial Validation Cohort**:
The first users and cases used to judge the product direction, currently limited to candidates applying for Chinese AI product manager roles. It does not define every role the software can technically accept.
_Avoid_: Entire supported market, proven ideal customer profile

**Role Signal**:
One capability, result, or pattern of ownership that the target job is likely to reward. An explicit signal links to the relevant JD wording; an inferred signal is labeled as interpretation and carries a short rationale.
_Avoid_: Keyword count, recruiter truth

**Base Fact**:
A statement the candidate supplies about what they did, decided, influenced, or achieved. It is accepted as the working input without demanding documentary proof.
_Avoid_: Verified evidence, objective ground truth

**Experience Entry**:
One internship or full-time employment container holding shared context such as organization, role, and dates. It may contain one or more Experience Items but is not itself the smallest claim source.
_Avoid_: Resume bullet, single achievement, standalone project

**Experience Item**:
The smallest reusable claim source: one standalone project or one coherent project, responsibility module, or outcome story inside an Experience Entry. It groups Base Facts that can support one or more distinct Competitive Claims.
_Avoid_: Entire multi-project employment history, any resume section, evidence dossier, skill keyword

**Experience Library**:
The owner's collection of reusable Experience Entries, Experience Items, and Base Facts across Target Applications. The user sees and edits current saved content; imported or inferred content enters the library only through an explicit save.
_Avoid_: Fact approval workflow, user-managed version history, shared training corpus

**Source Snapshot**:
The read-only Experience Entry context, Experience Item, and Base Fact content captured inside a Target Application when it is used to generate claims. It preserves what the application used after the Experience Library changes, but it is not a user-managed fact version or external verification record.
_Avoid_: Editable library item, approved fact, evidence package

**Source Change Notice**:
A non-blocking status indicating that current Experience Item or Base Fact content differs from the Source Snapshot behind an existing claim. The claim remains unchanged and usable; only an explicit re-analysis can generate from the updated source.
_Avoid_: Invalid claim, automatic regeneration, silent source migration

**Fact Update Proposal**:
A candidate-authored or model-extracted suggestion to add or revise a Base Fact after claim editing or Interview Rehearsal. It has no effect on the Experience Library until the owner explicitly saves it there.
_Avoid_: Automatic memory, silent fact learning, accepted fact

**Achievement Lead**:
A promising but under-developed part of an Experience Item that may become a stronger job-relevant claim through reframing or optional user editing.
_Avoid_: Missing capability, proven achievement

**Defensible Amplification**:
Selecting, translating, compressing, and strengthening candidate-provided experience so its market value is easier to recognize, without silently adding a new material fact.
_Avoid_: Fact verification, unrestricted fabrication

**Competitive Claim**:
The strongest immediately usable Resume Claim supported by the current Base Facts. It may strengthen structure and wording but cannot upgrade the category of ownership, causality, technology, scale, or outcome; it is the product's primary generated wording, not one option in a set of parallel rewrites.
_Avoid_: Default tier, conservative version, first draft

**Stretch Direction**:
The single highest-value recommendation attached to a Competitive Claim. It names the current Expression Gap, explains why it matters for the Target Application, and describes how the candidate could expand it; it is guidance for the user's own thinking, not a second Resume Claim.
_Avoid_: Stretch Claim, completed version, hypothetical fact

**Expression Gap**:
The single highest-value aspect of an Experience Item or Competitive Claim that is not yet communicated clearly for its primary Role Signal, such as ownership, judgment, difficulty, scale, or outcome. It describes the wording's current limitation, not a missing candidate capability.
_Avoid_: Capability Gap, qualification deficit, disqualification

**Resume Claim**:
A job-specific bullet or project description produced from Base Facts and any candidate-authored edits.
_Avoid_: Source quotation, hiring promise

**Open Detail**:
A material detail that would make a Resume Claim stronger but has not been supplied yet, such as a number, scope, decision right, or outcome. The product exposes it through a Stretch Direction or marks it for editing rather than asking for it or inventing it silently.
_Avoid_: Evidence gap, disqualification

**Interview Story**:
A concise explanation of the context, action, trade-off, and result behind an accepted Resume Claim, including likely follow-up questions.
_Avoid_: Proof package, scripted lie

**Interview Rehearsal**:
An optional multi-turn practice session that begins from the selected Resume Claim and asks adaptive follow-up questions based on the candidate's answers. The AI stops when another question is unlikely to materially improve the story's context, personal role, key action or decision, result or limitation, Role Signal relevance, or coherence; a user who stops replying needs no explicit end action.
_Avoid_: Completion interview, generic chat, background check

**Interview Review**:
An on-demand, qualitative summary of an Interview Rehearsal that the user explicitly requests. It identifies what was explained clearly, likely follow-up gaps, a 60-second Interview Story grounded in the user's answers, and one highest-value improvement; it never produces an overall score or hiring probability.
_Avoid_: Automatic wrap-up, session termination, numeric score, hiring evaluation

**User Decision**:
The candidate's selection, correction, strengthening, or rejection of a proposed Resume Claim.
_Avoid_: External verification

**Writing Preference Profile**:
An owner-scoped, inspectable summary of stylistic preferences learned only from differences in Resume Claims the user explicitly saves, such as length, information density, technical detail, or result placement. It never stores or relaxes material-fact boundaries and can be edited, disabled, or cleared.
_Avoid_: Hidden personalization, candidate facts, personality profile

**Targeted Resume Version**:
The owner-scoped collection of Resume Claims selected or edited for one Target Application, with their Experience Item and Role Signal links plus related interview state. In P0 it is not a complete formatted resume document.
_Avoid_: Resume template, PDF editor, career roadmap, guaranteed application package
