// ---------- Tailwind class presets (migrated from legacy.css `.performance-page` rules) ----------
// It is too large to be used as inline className or hardcoded in JSX, so we centralize it here for better 
// maintainability and readability by className={style.h3} for example and yes, i know i am defeating the 
// entire purpose of using Tailwind CSS, but fuck it.
export const style = {
    h3: "font-blackletter text-[2rem] text-coral [text-shadow:0_0_10px_hsl(10_96%_70%/0.35)] tracking-[0.04em] mb-4 pb-2 border-b border-coral/35 max-[600px]:text-[1.35rem] max-[600px]:break-words max-[600px]:leading-tight",
    h4: "font-display text-hot tracking-[0.12em] uppercase text-[1.1rem] mb-2.5 max-[600px]:text-[0.95rem] max-[600px]:break-words",
    statCard:
        "relative bg-gradient-panel border border-coral/35 rounded-[6px] p-[1.25rem_1.4rem] [box-shadow:var(--bevel),0_0_18px_hsl(10_96%_70%/0.08)] max-[600px]:p-4",
    statsCards:
        "grid gap-5 [grid-template-columns:repeat(auto-fit,minmax(180px,1fr))] max-[600px]:grid-cols-1",
    statGrid:
        "grid gap-[0.9rem] [grid-template-columns:repeat(auto-fit,minmax(150px,1fr))] mt-2 max-[600px]:grid-cols-2 max-[600px]:gap-[0.55rem] max-[420px]:grid-cols-1",
    statItem:
        "bg-base-800/60 border border-coral/20 rounded-sm p-[0.85rem_0.9rem] flex flex-col gap-1.5 text-left items-start max-[600px]:p-[0.65rem_0.7rem] min-w-0",
    statLabel:
        "text-ink/70 font-display text-[0.68rem] tracking-[0.18em] uppercase max-[600px]:text-[0.6rem] max-[600px]:tracking-[0.12em] break-words",
    statValue:
        "text-coral text-[1.35rem] font-bold max-[600px]:text-[1.05rem] break-words",
    trendsGrid:
        "grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(220px,1fr))] max-[600px]:grid-cols-1",
    trendSection:
        "bg-base-800/60 border border-hot/35 border-l-[3px] border-l-hot rounded-sm p-[1rem_1.1rem] max-[600px]:p-[0.8rem_0.85rem]",
    mostPlayedList: "grid grid-cols-1 gap-[0.55rem]",
    mostPlayedItem:
        "flex justify-between items-center p-[0.65rem_0.9rem] bg-base-800/60 border border-coral/20 border-l-[3px] border-l-coral rounded-sm max-[600px]:p-[0.55rem_0.7rem] max-[600px]:flex-wrap max-[600px]:gap-[0.35rem]",
    championName: "text-ink font-display text-[0.9rem]",
    gamesCount: "text-coral text-[0.8rem] font-semibold",
    roleList: "flex flex-col gap-[0.65rem]",
    roleItem:
        "grid items-center gap-4 p-[0.65rem_0.9rem] bg-base-800/60 border border-coral/20 rounded-sm [grid-template-columns:110px_1fr_90px] max-[600px]:[grid-template-columns:80px_1fr_60px] max-[600px]:gap-2 max-[600px]:p-[0.55rem_0.7rem]",
    roleName:
        "bg-gradient-to-b from-coral to-hot text-[hsl(330_50%_10%)] border border-hot/80 text-center py-1 px-2 rounded-full font-pixel text-[0.55rem] tracking-[0.08em] uppercase max-[600px]:text-[0.5rem]",
    roleBarContainer:
        "h-3 bg-black/50 border border-coral/25 rounded-full overflow-hidden",
    roleBar:
        "h-full bg-gradient-to-r from-coral to-hot shadow-[0_0_10px_hsl(10_96%_70%/0.55)] transition-[width] duration-[400ms]",
    roleCount:
        "text-ink/80 text-[0.8rem] text-right font-display max-[600px]:text-[0.7rem]",
    perfTable:
        "flex flex-col bg-gradient-panel border border-coral/35 rounded-sm overflow-hidden shadow-bevel max-[900px]:overflow-x-auto",
    perfRowGrid:
        "grid items-center [grid-template-columns:minmax(120px,1.4fr)_minmax(80px,1fr)_minmax(70px,0.9fr)_minmax(80px,1fr)_minmax(90px,1fr)_minmax(90px,1fr)_minmax(70px,0.9fr)_minmax(70px,0.9fr)_minmax(80px,1fr)] max-[900px]:min-w-[760px]",
    perfHeader:
        "bg-gradient-to-b from-hot/90 to-[hsl(8_60%_35%/0.9)] border-b border-hot",
    perfHeaderCell:
        "text-[hsl(330_50%_10%)] font-display text-[0.85rem] tracking-[0.14em] uppercase font-bold p-[0.85rem_0.8rem] max-[900px]:text-[0.78rem] max-[900px]:p-[0.6rem_0.55rem]",
    perfRowCell:
        "p-[0.7rem_0.8rem] text-ink text-[0.85rem] border-b border-coral/10 max-[900px]:text-[0.78rem] max-[900px]:p-[0.6rem_0.55rem]",
    spellsTable:
        "flex flex-col bg-gradient-panel border border-coral/35 rounded-sm overflow-hidden max-[900px]:overflow-x-auto",
    spellsRowGrid:
        "grid items-center grid-cols-[2fr_1fr_1fr_1fr] max-[900px]:min-w-[520px]",
    spellsHeader: "bg-gradient-to-b from-hot/90 to-[hsl(8_60%_35%/0.9)]",
    filtersCard:
        "bg-gradient-panel border border-coral/35 p-[1.4rem] rounded-[6px]",
    filtersGrid:
        "grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(220px,1fr))] mt-3",
    filterGroup: "flex flex-col gap-[0.45rem]",
    filterLabel:
        "text-coral font-display text-[0.68rem] tracking-[0.18em] uppercase",
    input:
        "w-full bg-surface-inset text-ink border border-border rounded-none p-[0.75rem_1rem] font-display text-[0.9rem] outline-none transition-[border-color,box-shadow] duration-150 appearance-none focus:border-coral focus:shadow-inner-glow placeholder:text-ink/45 disabled:opacity-55 disabled:cursor-not-allowed",
    select:
        "w-full bg-surface-inset text-ink border border-border rounded-none p-[0.75rem_2.2rem_0.75rem_1rem] font-display text-[0.9rem] outline-none appearance-none cursor-pointer focus:border-coral focus:shadow-inner-glow bg-no-repeat [background-image:linear-gradient(45deg,transparent_50%,hsl(var(--coral))_50%),linear-gradient(135deg,hsl(var(--coral))_50%,transparent_50%)] [background-position:calc(100%-18px)_50%,calc(100%-12px)_50%] [background-size:6px_6px,6px_6px] disabled:opacity-55 disabled:cursor-not-allowed",
    checkboxGroup: "flex flex-row items-center gap-[0.6rem]",
    checkboxLabel:
        "inline-flex items-center gap-[0.55rem] text-ink font-display text-[0.85rem] tracking-[0.04em] cursor-pointer normal-case",
    checkbox:
        "appearance-none w-[18px] h-[18px] bg-surface-inset border border-border rounded-[3px] grid place-content-center cursor-pointer transition-[border-color,background] duration-150 checked:bg-gradient-to-b checked:from-coral checked:to-hot checked:border-hot checked:after:content-['✓'] checked:after:text-[hsl(330_50%_10%)] checked:after:font-extrabold checked:after:text-[12px] checked:after:leading-none disabled:opacity-55 disabled:cursor-not-allowed",
    analyzeBtn:
        "bg-gradient-to-b from-coral to-hot border border-hot text-[hsl(330_50%_10%)] font-display font-bold tracking-[0.14em] uppercase p-[0.85rem_1.4rem] rounded-sm cursor-pointer mt-4 shadow-[0_4px_14px_hsl(8_100%_61%/0.35)] transition-[transform,box-shadow] duration-150 hover:enabled:-translate-y-px hover:enabled:shadow-[0_6px_18px_hsl(8_100%_61%/0.5)] disabled:opacity-55 disabled:cursor-not-allowed",
    noticeBox:
        "text-ink/75 bg-hot/10 border border-hot/25 border-l-[3px] border-l-hot rounded-[0_4px_4px_0] p-[0.75rem_1rem] mt-3 text-[0.85rem] text-left not-italic",
    masteryGrid:
        "grid [grid-template-columns:repeat(auto-fit,minmax(min(260px,100%),1fr))] gap-4 mt-4 w-full max-[599px]:grid-cols-1 max-[599px]:gap-3",
    masteryCard:
        "bg-gradient-panel border border-coral/35 border-l-[3px] border-l-coral rounded-[6px] p-[1rem_1.1rem] flex flex-col gap-[0.65rem] min-w-0 shadow-bevel relative overflow-hidden max-[599px]:p-[0.85rem_0.9rem]",
    masteryLevel: "flex flex-wrap items-center gap-[0.4rem]",
    masteryInfo: "flex flex-col items-stretch gap-2 min-w-0",
    masteryH4:
        "m-0 text-[1rem] text-ink break-words border-b border-dashed border-coral/25 pb-1.5 font-display",
    pointsValue: "text-coral font-bold text-[0.95rem]",
    badgeBase:
        "inline-flex items-center px-[0.55rem] py-1 rounded-sm text-[0.78rem] font-bold tracking-[0.02em] border [text-shadow:0_1px_0_rgb(0_0_0_/_0.35)] [box-shadow:inset_0_1px_0_rgb(255_255_255_/_0.2),0_1px_3px_rgb(0_0_0_/_0.3)] text-white",
    levelBadgeColor: "bg-hot border-[hsl(8_75%_45%)]",
    milestoneBadge:
        "bg-gradient-to-b from-[#f0c64b] to-[#b07a18] border-[#7a5210] !text-[#2a1a02] [text-shadow:0_1px_0_rgba(255,255,255,0.25)]",
    markBadge:
        "font-blackletter bg-gradient-to-b from-[#9c6bd8] to-[#5a2ea0] border-[#3d1e75]",
    masteryProgress: "flex flex-col gap-[0.3rem] mt-[0.15rem]",
    progressLabels:
        "flex justify-between text-[0.72rem] text-ink/75 [font-variant-numeric:tabular-nums]",
    progressBarBg:
        "relative w-full h-2.5 bg-black/45 border border-coral/35 rounded-full overflow-hidden shadow-[inset_0_1px_3px_rgb(0_0_0_/_0.6)]",
    progressBarFill:
        "h-full bg-gradient-to-r from-coral to-hot rounded-full shadow-[0_0_8px_hsl(8_100%_61%/0.6),inset_0_1px_0_rgb(255_255_255_/_0.35)] transition-[width] duration-[400ms]",
    nextLevelLabel:
        "text-center text-[0.7rem] text-ink/65 italic mt-[0.1rem]",
    masteryDetails: "flex flex-wrap gap-[0.4rem]",
    lastPlayed:
        "text-[0.78rem] text-ink/70 mt-auto pt-[0.35rem] border-t border-dashed border-coral/15",
    totalScoreValue:
        "text-[2.4rem] font-bold text-coral [text-shadow:0_0_12px_hsl(10_96%_70%/0.4)]",
    totalScoreLabel:
        "block font-display text-[0.7rem] tracking-[0.18em] uppercase text-ink-muted",
    resultsSection: "flex flex-col gap-6",
    combinationsList: "grid grid-cols-1 gap-[0.55rem]",
    combinationItem:
        "flex justify-between items-center p-[0.6rem_0.9rem] bg-base-800/60 border border-coral/20 border-l-[3px] border-l-coral rounded-sm text-ink text-[0.88rem]",
    count: "text-coral font-bold",
    legend: "flex gap-4 flex-wrap",
    legendLabel:
        "font-display text-[0.7rem] tracking-[0.18em] uppercase text-ink-muted",
    sectionDivider:
        "h-px [background:linear-gradient(90deg,transparent,hsl(10_96%_70%/0.6),transparent)] my-5 border-0",
    runesStatsGrid:
        "grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(180px,1fr))]",
    cbGrid:
        "grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(280px,1fr))] mt-3",
    cbItem: "bg-base-800/60 border border-coral/25 rounded-sm p-4",
    cbH4:
        "font-blackletter text-[1.05rem] text-coral m-0 mb-1 pb-1.5 border-b border-coral/30 [text-shadow:0_0_10px_hsl(10_96%_70%/0.35)] tracking-[0.03em]",
    cbSection:
        "mt-[0.85rem] p-[0.65rem_0.75rem] bg-[hsl(277_38%_16%/0.55)] border border-coral/20 border-l-2 border-l-coral rounded-[3px]",
    cbH5:
        "font-display text-[0.72rem] tracking-[0.15em] uppercase text-coral m-0 mb-2 pb-[0.35rem] border-b border-dashed border-coral/25 flex items-center gap-[0.4rem] before:content-['◆'] before:text-hot before:text-[0.55rem]",
    cbItemSmall:
        "flex justify-between items-center gap-3 p-[0.45rem_0.65rem] border-b border-dashed border-coral/15 last:border-b-0 text-[0.82rem] text-ink",
    cbCount:
        "font-pixel text-[0.55rem] text-coral bg-coral/10 border border-coral/25 px-[0.45rem] py-[0.2rem] rounded-[3px]",
    noData: "text-ink-dim italic text-[0.8rem] py-1",
    errorState:
        "text-center p-4 bg-gradient-to-b from-[hsl(0_100%_66%/0.18)] to-[hsl(0_80%_28%/0.25)] border-2 border-danger rounded-sm text-[hsl(0_100%_85%)] shadow-[0_2px_8px_hsl(0_84%_60%/0.25)] flex flex-col items-center gap-4",
    retryBtn:
        "px-4 py-2 rounded-sm border border-primary/70 bg-surface-inset text-primary font-display text-xs uppercase tracking-[0.18em] hover:bg-primary/10 transition-colors",
    loadingState:
        "flex flex-col items-center justify-center gap-3 py-12 text-center text-ink/80",
} as const;