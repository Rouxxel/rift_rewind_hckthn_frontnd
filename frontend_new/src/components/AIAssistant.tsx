import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { apiService } from '../services/api';
import { RotateCcw, X, Maximize2, Minimize2, SendHorizontal, Loader2 } from 'lucide-react';
import assistantIcon from '../assets/ic_launcher.png';

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

    return (
        <>
            {!isOpen && (
                <button
                    className="ai-assistant-toggle"
                    onClick={() => setIsOpen(true)}
                    title="Open AI Assistant"
                >
                    <img src={assistantIcon} alt="AI Assistant Icon" className="w-6 h-6 object-contain" />
                </button>
            )}

            {isOpen && (
                <div className={`ai-assistant-window ${isFullScreen ? 'ai-assistant-window--fullscreen' : ''}`}>
                    <div className="ai-assistant-header">
                        <div className="header-title"><span>Lol Coach</span></div>
                        <div className="header-actions">
                            <button
                                onClick={() => setIsFullScreen(prev => !prev)}
                                title={isFullScreen ? 'Restore size' : 'Full screen'}
                                className="fullscreen-btn"
                            >
                                {isFullScreen ? <Minimize2 size={20} strokeWidth={2.5} /> : <Maximize2 size={20} strokeWidth={2.5} />}
                            </button>
                            <button onClick={resetChat} title="New Chat" className="reset-btn">
                                <RotateCcw size={20} strokeWidth={2.5} />
                            </button>
                            <button onClick={() => setIsOpen(false)} className="close-btn">
                                <X size={20} strokeWidth={2.5} />
                            </button>
                        </div>
                    </div>

                    <div className="ai-assistant-messages">
                        {messages.length === 0 && (
                            <div className="welcome-message">
                                <p>{getWelcomeMessage()}</p>
                                <div className="flex flex-col gap-2 mt-4 w-full">
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
                            <div key={idx} className={`message ${msg.role}`}>
                                <div className="message-content">
                                    <div className="message-text">
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
                                                    em: ({ node, ...props }) => <em style={{ fontSize: '1.1rem', fontFamily: 'monospace'}} {...props} />,
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

                    <div className="ai-assistant-input">
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                            placeholder="Ask me anything..."
                            disabled={loading}
                        />
                        <button className="send-button" onClick={sendMessage} disabled={loading || !input.trim()}>
                            {loading ? <Loader2 className="animate-spin" /> : <SendHorizontal />}
                        </button>
                    </div>
                </div>
            )}
        </>
    );
};
