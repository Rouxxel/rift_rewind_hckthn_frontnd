import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { apiService } from '../services/api';
import { RotateCcw, X, Maximize2, Minimize2, SendHorizontal, Loader2 } from 'lucide-react';
import { GlossButton } from "@/components/ui-retro/GlossButton";
import assistantIcon from '../assets/ic_launcher.jpeg';

interface Message {
    role: 'user' | 'assistant';
    content: string;
    isTyping?: boolean;
    displayedContent?: string;
}

interface AIAssistantProps {
    currentPage: 'dashboard' | 'match-history' | 'performance' | 'predictions' | 'game-assets';
    pageContext?: any;
}

export const AIAssistant: React.FC<AIAssistantProps> = ({ currentPage, pageContext }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [isFullScreen, setIsFullScreen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const typingIntervalRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Load conversation history for this page
    useEffect(() => {
        const savedMessages = localStorage.getItem(`ai_chat_${currentPage}`);
        if (savedMessages) {
            const parsed = JSON.parse(savedMessages);
            const fullyTyped = parsed.map((msg: Message) => ({
                ...msg,
                isTyping: false,
                displayedContent: msg.content
            }));
            setMessages(fullyTyped);
        } else {
            setMessages([]);
        }
    }, [currentPage]);

    // Save conversation history
    useEffect(() => {
        if (messages.length > 0) {
            const toSave = messages.map(msg => ({
                role: msg.role,
                content: msg.content
            }));
            localStorage.setItem(`ai_chat_${currentPage}`, JSON.stringify(toSave));
        }
    }, [messages, currentPage]);

    // Auto-scroll to bottom
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Cleanup typing interval on unmount
    useEffect(() => {
        return () => {
            if (typingIntervalRef.current) {
                clearTimeout(typingIntervalRef.current);
            }
        };
    }, []);

    // Typewriter effect for AI messages
    useEffect(() => {
        const lastMessage = messages[messages.length - 1];
        if (!lastMessage || lastMessage.role !== 'assistant' || !lastMessage.isTyping) {
            return;
        }

        const fullContent = lastMessage.content;
        const currentDisplayed = lastMessage.displayedContent || '';

        if (currentDisplayed.length < fullContent.length) {
            typingIntervalRef.current = setTimeout(() => {
                setMessages(prev => {
                    const updated = [...prev];
                    const lastIdx = updated.length - 1;
                    updated[lastIdx] = {
                        ...updated[lastIdx],
                        displayedContent: fullContent.slice(0, currentDisplayed.length + 1)
                    };
                    return updated;
                });
            }, 10);
        } else {
            setMessages(prev => {
                const updated = [...prev];
                const lastIdx = updated.length - 1;
                updated[lastIdx] = {
                    ...updated[lastIdx],
                    isTyping: false,
                    displayedContent: fullContent
                };
                return updated;
            });
        }

        return () => {
            if (typingIntervalRef.current) {
                clearTimeout(typingIntervalRef.current);
            }
        };
    }, [messages]);

    const buildContextData = () => {
        const context: any = {
            current_page: currentPage,
            page_description: getPageDescription(currentPage),
        };

        const currentMatchId = localStorage.getItem('rift_rewind_current_match_id');
        const currentChampionName = localStorage.getItem('rift_rewind_current_champion_name');
        const currentItemId = localStorage.getItem('rift_rewind_current_item_id');

        const cacheKeys = Object.keys(localStorage).filter(key => key.startsWith('rift_rewind_cache_'));

        cacheKeys.forEach(key => {
            try {
                const cached = JSON.parse(localStorage.getItem(key) || '{}');
                const data = cached.data;

                if (data) {
                    if (key.includes('champions')) {
                        if (currentPage === 'game-assets' || currentPage === 'predictions') {
                            context.champions_sample = Object.values(data).slice(0, 30).map((c: any) => ({
                                name: c.name,
                                title: c.title,
                                tags: c.tags
                            }));
                        }
                        if (currentPage === 'game-assets' && currentChampionName &&
                            (key.includes(currentChampionName) || (typeof data === 'object' && data[currentChampionName]))) {
                            context.selected_champion_details = data[currentChampionName] || data;
                        }
                    }

                    if (key.includes('items') && currentPage === 'game-assets') {
                        context.items_count = Object.keys(data).length;
                        if (currentItemId && data[currentItemId]) {
                            context.selected_item_details = data[currentItemId];
                        }
                    }

                    if (currentPage === 'performance') {
                        if (key.includes('player_performance')) context.performance_overview = data;
                        if (key.includes('champion_mastery')) context.mastery_stats = data;
                        if (key.includes('summoner_spells')) context.spells_analysis = data;
                        if (key.includes('rune_masteries')) context.runes_analysis = data;
                    }

                    if (currentPage === 'match-history') {
                        if (key.includes('match_history')) context.recent_match_ids = data;
                        if (currentMatchId) {
                            if (key.includes(`match_details_${currentMatchId}`)) context.current_match_details = data;
                            if (key.includes(`match_participants_${currentMatchId}`)) context.current_match_participants = data;
                            if (key.includes('team_comp')) context.current_match_team_analysis = data;
                        }
                    }

                    if (currentPage === 'predictions') {
                        if (key.includes('winrates')) {
                            context.top_winrate_champions = [...data]
                                .sort((a, b) => b.win_rate - a.win_rate)
                                .slice(0, 10);
                        }
                        if (key === 'rift_rewind_cache_current_match_prediction') {
                            context.current_prediction = {
                                blue_team: cached.blue_team,
                                red_team: cached.red_team,
                                game_mode: cached.game_mode,
                                prediction_result: data
                            };
                        }
                    }
                }
            } catch (e) {
                // Ignore
            }
        });

        const userData = localStorage.getItem('rift_rewind_user_data');
        if (userData) {
            const user = JSON.parse(userData);
            context.summoner = {
                name: `${user.gameName}#${user.tagLine}`,
                puuid: user.puuid
            };
        }

        if (pageContext) {
            context.page_specific_data = pageContext;
        }

        return context;
    };

    const getPageDescription = (page: string): string => {
        const descriptions: Record<string, string> = {
            'dashboard': 'Main dashboard showing overview of available features and user profile',
            'match-history': 'Detailed match history with game statistics, team compositions, and timelines',
            'performance': 'Performance analysis including champion mastery, summoner spells usage, and rune statistics',
            'predictions': 'Champion winrates and match outcome predictions based on team compositions',
            'game-assets': 'Browse League of Legends champions and items with detailed information'
        };
        return descriptions[page] || 'Unknown page';
    };

    const getPageGuidance = (userQuestion: string): string | null => {
        const question = userQuestion.toLowerCase();
        if (currentPage !== 'match-history' && (question.includes('match') || question.includes('game history'))) {
            return 'To view your match history and game details, please navigate to the **Match History** page from the dashboard.';
        }
        if (currentPage !== 'performance' && (question.includes('champion mastery') || question.includes('summoner spell') || question.includes('rune'))) {
            return 'To analyze your performance, champion mastery, and rune usage, please visit the **Performance Analysis** page.';
        }
        if (currentPage !== 'predictions' && (question.includes('winrate') || question.includes('win rate') || question.includes('prediction'))) {
            return 'To view champion winrates and match predictions, please go to the **Predictions** page.';
        }
        if (currentPage !== 'game-assets' && (question.includes('champion info') || question.includes('item info') || question.includes('champion details'))) {
            return 'To explore champion and item details, please visit the **Game Assets** page.';
        }
        return null;
    };

    const sendMessage = async () => {
        if (!input.trim() || loading) return;

        const userMessage: Message = { role: 'user', content: input };
        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setLoading(true);

        try {
            const guidance = getPageGuidance(input);
            if (guidance) {
                const guidanceMessage: Message = {
                    role: 'assistant',
                    content: guidance,
                    isTyping: true,
                    displayedContent: ''
                };
                setMessages(prev => [...prev, guidanceMessage]);
                setLoading(false);
                return;
            }

            const requestBody: any = { prompt: input };

            if (messages.length === 0) {
                const contextData = buildContextData();
                requestBody.context_data = contextData;
            }

            if (messages.length > 0) {
                const history = messages.slice(-10).map(msg => ({
                    role: msg.role,
                    content: msg.content
                }));
                requestBody.conversation_history = history;
            }

            const response = await apiService.getAIResponse(
                requestBody.prompt,
                requestBody.context_data,
                requestBody.conversation_history
            );

            const aiMessage: Message = {
                role: 'assistant',
                content: response.ai_response,
                isTyping: true,
                displayedContent: ''
            };
            setMessages(prev => [...prev, aiMessage]);
        } catch (error: any) {
            const errorMessage: Message = {
                role: 'assistant',
                content: error.message.includes('429')
                    ? 'Too many requests. Please wait a moment and try again.'
                    : 'Sorry, I encountered an error. Please try again.',
                isTyping: true,
                displayedContent: ''
            };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setLoading(false);
        }
    };

    const resetChat = () => {
        setMessages([]);
        localStorage.removeItem(`ai_chat_${currentPage}`);
    };

    const getWelcomeMessage = (): string => {
        const welcomeMessages: Record<string, string> = {
            'dashboard': 'Hey! I\'m your Lol Coach. Ask me about what this app can do, or what insights you can get from your League data!',
            'match-history': 'I can help you understand your match history! Ask me about specific games, team compositions, or performance trends.',
            'performance': 'Let\'s analyze your performance! Ask me about your champion mastery, summoner spell choices, or rune preferences.',
            'predictions': 'Ready to predict some matches? Ask me about champion winrates, team compositions, or match outcomes!',
            'game-assets': 'Want to learn about champions or items? Ask me anything about League of Legends game assets!'
        };
        return welcomeMessages[currentPage] || 'How can I help you today?';
    };

    const ghostBtn =
        "inline-flex items-center justify-center w-9 h-9 rounded-md bg-gradient-to-b from-base-500 to-base-700 border text-ink transition-colors hover:from-coral hover:to-hot hover:text-[#2a0d18]";

    return (
        <>
            {!isOpen && (
                <button
                    onClick={() => setIsOpen(true)}
                    title="Open AI Assistant"
                    className="fixed right-5 bottom-5 z-[900] w-16 h-16 rounded-full flex items-center justify-center border-2 shadow-[0_8px_22px_rgba(0,0,0,0.55),0_0_24px_hsl(10_96%_70%/0.55)] animate-pulse-glow"
                >
                    <img src={assistantIcon} alt="AI Assistant Icon" className="w-6 h-6 object-contain" />
                </button>
            )}

            {isOpen && (
                <div
                    className={
                        (isFullScreen
                            ? "fixed inset-6 "
                            : "fixed right-5 bottom-[6.5rem] w-[380px] max-w-[calc(100vw-2rem)] h-[540px] max-h-[75vh] max-sm:right-4 max-sm:bottom-[5.5rem] max-sm:w-[calc(100vw-2rem)] ") +
                        "z-[901] flex flex-col overflow-hidden rounded-md border-2 bg-gradient-panel shadow-bevel animate-fade-in-up"
                    }
                >
                    <div className="flex items-center justify-between gap-2 px-4 py-[0.85rem] border-b bg-[linear-gradient(180deg,hsl(var(--base-500)),hsl(var(--base-800)))]">
                        <div className="mt-3 font-blackletter text-3xl text-ink text-glow"><span>Lol Coach</span></div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setIsFullScreen(prev => !prev)}
                                title={isFullScreen ? 'Restore size' : 'Full screen'}
                                className={ghostBtn}
                            >
                                {isFullScreen ? <Minimize2 size={20} strokeWidth={2.5} /> : <Maximize2 size={20} strokeWidth={2.5} />}
                            </button>
                            <button onClick={resetChat} title="New Chat" className={ghostBtn}>
                                <RotateCcw size={20} strokeWidth={2.5} />
                            </button>
                            <button
                                onClick={() => setIsOpen(false)}
                                className="inline-flex items-center justify-center w-9 h-9 bg-gradient-to-b from-hot to-hot-deep border border-hot-deep text-ink hover:brightness-110 transition"
                            >
                                <X size={20} strokeWidth={2.5} />
                            </button>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 bg-[hsl(277_38%_16%)]">
                        {messages.length === 0 && (
                            <div className="p-8 text-center italic text-ink/70">
                                <p>{getWelcomeMessage()}</p>
                                <div className="flex flex-col gap-2 mt-4 w-full not-italic">
                                    {['What can this app do?', 'How can I improve my gameplay?', 'Explain this page'].map((q) => (
                                        <button
                                            key={q}
                                            onClick={() => setInput(q)}
                                            className="w-full text-left px-3 py-2 rounded-md border border-primary/30 bg-surface-inset/60 hover:bg-surface-inset hover:border-primary/60 transition-colors font-pixel text-[11px] uppercase tracking-wider text-foreground/90 hover:text-primary"
                                        >
                                            ▸ {q}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {messages.map((msg, idx) => (
                            <div
                                key={idx}
                                className={
                                    "px-[0.9rem] py-3 rounded-md max-w-[85%] text-base leading-[1.55] text-black shadow-[0_2px_6px_rgba(0,0,0,0.55)] border " +
                                    (msg.role === 'user'
                                        ? "self-end bg-coral border-coral-bright"
                                        : "self-start bg-hot")
                                }
                            >
                                <div className="flex flex-col gap-1">
                                    <div className="whitespace-pre-wrap">
                                        {msg.role === 'user' ? (
                                            msg.content
                                        ) : (
                                            <ReactMarkdown
                                                components={{
                                                    p: ({ node, ...props }) => <p style={{ margin: '0.5rem 0' }} {...props} />,
                                                    ul: ({ node, ...props }) => <ul style={{ marginLeft: '1.5rem', marginTop: '0.5rem' }} {...props} />,
                                                    ol: ({ node, ...props }) => <ol style={{ marginLeft: '1.5rem', marginTop: '0.5rem' }} {...props} />,
                                                    li: ({ node, ...props }) => <li style={{ marginBottom: '0.25rem' }} {...props} />,
                                                    code: ({ node, ...props }: any) =>
                                                        props.inline ? (
                                                            <code style={{ background: 'rgba(200, 155, 60, 0.2)', padding: '0.2rem 0.4rem', borderRadius: '3px', fontFamily: 'monospace' }} {...props} />
                                                        ) : (
                                                            <code style={{ display: 'block', background: 'rgba(200, 155, 60, 0.2)', padding: '0.75rem', borderRadius: '6px', fontFamily: 'monospace', overflowX: 'auto', marginTop: '0.5rem' }} {...props} />
                                                        ),
                                                    strong: ({ node, ...props }) => <strong style={{ fontWeight: 'bold', fontFamily: 'MedievalSharp' }} {...props} />,
                                                    em: ({ node, ...props }) => <em style={{ fontSize: '1.1rem', fontFamily: 'monospace' }} {...props} />,
                                                }}
                                            >
                                                {msg.displayedContent || msg.content}
                                            </ReactMarkdown>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                        <div ref={messagesEndRef} />
                    </div>

                    <div className="flex gap-2 px-[1.1rem] py-3 border-t bg-[#1a0d24]">
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                            placeholder="Ask me anything..."
                            disabled={loading}
                            className="flex-1 min-w-0 px-4 py-3 bg-surface-inset text-ink border border-border font-display text-sm leading-tight outline-none transition-colors focus:border-primary focus:shadow-inner-glow placeholder:text-muted-foreground/60"
                        />
                        <GlossButton
                            variant="primary"
                            onClick={sendMessage}
                            disabled={loading || !input.trim()}
                            className=""
                        >
                            {loading ? <Loader2 className="animate-spin" /> : <SendHorizontal />}
                        </GlossButton>
                    </div>
                </div>
            )}
        </>
    );
};
