import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { apiService } from '../services/api';

interface Message {
    role: 'user' | 'assistant';
    content: string;
    isTyping?: boolean;
    displayedContent?: string;
}

interface AIAssistantProps {
    currentPage: 'dashboard' | 'match-history' | 'performance' | 'predictions' | 'game-assets';
    pageContext?: any; // Specific data for the current page
}

export const AIAssistant: React.FC<AIAssistantProps> = ({ currentPage, pageContext }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const typingIntervalRef = useRef<number | null>(null);

    // Load conversation history for this page
    useEffect(() => {
        console.log('📂 [AI Assistant] Loading conversation history for page:', currentPage);
        const savedMessages = localStorage.getItem(`ai_chat_${currentPage}`);
        if (savedMessages) {
            const parsed = JSON.parse(savedMessages);
            console.log('💬 [AI Assistant] Found', parsed.length, 'saved messages');
            // Mark all loaded messages as fully typed
            const fullyTyped = parsed.map((msg: Message) => ({
                ...msg,
                isTyping: false,
                displayedContent: msg.content
            }));
            setMessages(fullyTyped);
        } else {
            console.log('📭 [AI Assistant] No saved messages found, starting fresh');
            setMessages([]);
        }
    }, [currentPage]);

    // Save conversation history
    useEffect(() => {
        if (messages.length > 0) {
            // Save only the essential data (no typing state)
            const toSave = messages.map(msg => ({
                role: msg.role,
                content: msg.content
            }));
            localStorage.setItem(`ai_chat_${currentPage}`, JSON.stringify(toSave));
            console.log('💾 [AI Assistant] Saved', toSave.length, 'messages to localStorage');
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
            }, 20); // 20ms = 0.02 seconds per character (50 chars/second)
        } else {
            // Typing complete
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

    // Build context data based on current page
    const buildContextData = () => {
        console.log('🔍 [AI Assistant] Building context data for page:', currentPage);

        const context: any = {
            current_page: currentPage,
            page_description: getPageDescription(currentPage),
        };

        // Get cached data from localStorage
        const cacheKeys = Object.keys(localStorage).filter(key => key.startsWith('rift_rewind_cache_'));
        console.log('💾 [AI Assistant] Found', cacheKeys.length, 'cache keys:', cacheKeys);

        cacheKeys.forEach(key => {
            try {
                const cached = JSON.parse(localStorage.getItem(key) || '{}');
                if (cached.data) {
                    // Add relevant cached data based on page
                    if (key.includes('champions') && (currentPage === 'game-assets' || currentPage === 'predictions')) {
                        context.champions = Object.keys(cached.data).slice(0, 20); // Sample of champions
                        console.log('🎮 [AI Assistant] Added champions data:', context.champions.length, 'champions');
                    }
                    if (key.includes('items') && currentPage === 'game-assets') {
                        context.items_count = Object.keys(cached.data).length;
                        console.log('⚔️ [AI Assistant] Added items count:', context.items_count);
                    }
                    if (key.includes('player_performance') && currentPage === 'performance') {
                        context.performance_data = cached.data;
                        console.log('📊 [AI Assistant] Added performance data');
                    }
                    if (key.includes('match_history') && currentPage === 'match-history') {
                        context.match_count = cached.data.length;
                        console.log('🎯 [AI Assistant] Added match count:', context.match_count);
                    }
                    if (key.includes('winrates') && currentPage === 'predictions') {
                        context.champion_winrates_available = true;
                        context.total_champions = cached.data.length;
                        console.log('📈 [AI Assistant] Added winrates data:', context.total_champions, 'champions');
                    }
                    if (key === 'rift_rewind_cache_current_match_prediction' && currentPage === 'predictions') {
                        console.log('🔮 [AI Assistant] Found current match prediction cache');
                        context.current_prediction = {
                            blue_team: cached.blue_team,
                            red_team: cached.red_team,
                            game_mode: cached.game_mode,
                            average_rank: cached.average_rank,
                            prediction_result: cached.data
                        };
                        console.log('📊 [AI Assistant] Added prediction data:', context.current_prediction);
                    }
                }
            } catch (e) {
                console.warn('⚠️ [AI Assistant] Failed to parse cache key:', key, e);
            }
        });

        // Add user data
        const userData = localStorage.getItem('rift_rewind_user_data');
        if (userData) {
            const user = JSON.parse(userData);
            context.summoner = {
                name: `${user.gameName}#${user.tagLine}`,
                puuid: user.puuid
            };
            console.log('👤 [AI Assistant] Added user data:', context.summoner.name);
        }

        // Add page-specific context if provided
        if (pageContext) {
            context.page_specific_data = pageContext;
            console.log('📄 [AI Assistant] Added page-specific context');
        }

        console.log('✅ [AI Assistant] Final context data:', context);
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

        // Check if user is asking about data not available on current page
        if (currentPage !== 'match-history' && (question.includes('match') || question.includes('game history'))) {
            return '📊 To view your match history and game details, please navigate to the **Match History** page from the dashboard.';
        }
        if (currentPage !== 'performance' && (question.includes('champion mastery') || question.includes('summoner spell') || question.includes('rune'))) {
            return '🎯 To analyze your performance, champion mastery, and rune usage, please visit the **Performance Analysis** page.';
        }
        if (currentPage !== 'predictions' && (question.includes('winrate') || question.includes('win rate') || question.includes('prediction'))) {
            return '🔮 To view champion winrates and match predictions, please go to the **Predictions** page.';
        }
        if (currentPage !== 'game-assets' && (question.includes('champion info') || question.includes('item info') || question.includes('champion details'))) {
            return '🎮 To explore champion and item details, please visit the **Game Assets** page.';
        }

        return null;
    };

    const sendMessage = async () => {
        if (!input.trim() || loading) return;

        console.log('🤖 [AI Assistant] Sending message:', input);
        console.log('📍 [AI Assistant] Current page:', currentPage);

        const userMessage: Message = { role: 'user', content: input };
        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setLoading(true);

        try {
            // Check if user is asking about data not on this page
            const guidance = getPageGuidance(input);
            if (guidance) {
                console.log('🧭 [AI Assistant] Providing page guidance:', guidance);
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

            // Build request
            const requestBody: any = {
                prompt: input,
            };

            // Include context on first message or if no history
            if (messages.length === 0) {
                const contextData = buildContextData();
                requestBody.context_data = contextData;
                console.log('📦 [AI Assistant] Including context data (first message):', contextData);
            } else {
                console.log('💬 [AI Assistant] Follow-up message, no context data');
            }

            // Include conversation history on follow-ups
            if (messages.length > 0) {
                // Limit to last 10 messages to avoid huge requests
                const history = messages.slice(-10).map(msg => ({
                    role: msg.role,
                    content: msg.content
                }));
                requestBody.conversation_history = history;
                console.log('📜 [AI Assistant] Including conversation history:', history.length, 'messages');
            }

            console.log('🚀 [AI Assistant] Calling AI API with request:', requestBody);

            // Call AI endpoint
            const response = await apiService.getAIResponse(
                requestBody.prompt,
                requestBody.context_data,
                requestBody.conversation_history
            );

            console.log('✅ [AI Assistant] Received AI response:', response);
            console.log('📝 [AI Assistant] Response length:', response.ai_response.length, 'characters');

            const aiMessage: Message = {
                role: 'assistant',
                content: response.ai_response,
                isTyping: true,
                displayedContent: ''
            };
            setMessages(prev => [...prev, aiMessage]);
            console.log('⌨️ [AI Assistant] Starting typewriter effect...');

        } catch (error: any) {
            console.error('❌ [AI Assistant] Request failed:', error);
            console.error('❌ [AI Assistant] Error details:', {
                message: error.message,
                status: error.status,
                stack: error.stack
            });
            const errorMessage: Message = {
                role: 'assistant',
                content: error.message.includes('429')
                    ? '⚠️ Too many requests. Please wait a moment and try again.'
                    : '❌ Sorry, I encountered an error. Please try again.',
                isTyping: true,
                displayedContent: ''
            };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setLoading(false);
        }
    };

    const resetChat = () => {
        console.log('🔄 [AI Assistant] Resetting chat for page:', currentPage);
        setMessages([]);
        localStorage.removeItem(`ai_chat_${currentPage}`);
        console.log('✅ [AI Assistant] Chat reset complete, conversation cleared');
    };

    const getWelcomeMessage = (): string => {
        const welcomeMessages: Record<string, string> = {
            'dashboard': '👋 Hey! I\'m your Rift Rewind assistant. Ask me about what this app can do, or what insights you can get from your League data!',
            'match-history': '📊 I can help you understand your match history! Ask me about specific games, team compositions, or performance trends.',
            'performance': '🎯 Let\'s analyze your performance! Ask me about your champion mastery, summoner spell choices, or rune preferences.',
            'predictions': '🔮 Ready to predict some matches? Ask me about champion winrates, team compositions, or match outcomes!',
            'game-assets': '🎮 Want to learn about champions or items? Ask me anything about League of Legends game assets!'
        };
        return welcomeMessages[currentPage] || 'How can I help you today?';
    };

    return (
        <>
            {/* Floating Button */}
            {!isOpen && (
                <button
                    className="ai-assistant-toggle"
                    onClick={() => {
                        console.log('💬 [AI Assistant] Opening chat window');
                        setIsOpen(true);
                    }}
                    title="Open AI Assistant"
                >
                    💬
                </button>
            )}

            {/* Chat Window */}
            {isOpen && (
                <div className="ai-assistant-window">
                    <div className="ai-assistant-header">
                        <div className="header-title">
                            <span className="ai-icon">🤖</span>
                            <span>Rift Rewind Assistant</span>
                        </div>
                        <div className="header-actions">
                            <button onClick={resetChat} title="New Chat" className="reset-btn">
                                🔄
                            </button>
                            <button onClick={() => {
                                console.log('❌ [AI Assistant] Closing chat window');
                                setIsOpen(false);
                            }} className="close-btn">
                                ✕
                            </button>
                        </div>
                    </div>

                    <div className="ai-assistant-messages">
                        {messages.length === 0 && (
                            <div className="welcome-message">
                                <p>{getWelcomeMessage()}</p>
                                <div className="quick-actions">
                                    <button onClick={() => setInput('What can this app do?')}>
                                        ❓ What can this app do?
                                    </button>
                                    <button onClick={() => setInput('How can I improve my gameplay?')}>
                                        📈 How can I improve?
                                    </button>
                                    <button onClick={() => setInput('Explain this page')}>
                                        📖 Explain this page
                                    </button>
                                </div>
                            </div>
                        )}

                        {messages.map((msg, idx) => (
                            <div key={idx} className={`message ${msg.role}`}>
                                <div className="message-avatar">
                                    {msg.role === 'user' ? '👤' : '🤖'}
                                </div>
                                <div className="message-content">
                                    <div className="message-text">
                                        {msg.role === 'user' ? (
                                            msg.content
                                        ) : (
                                            <>
                                                <ReactMarkdown
                                                    components={{
                                                        // Custom styling for markdown elements
                                                        p: ({ node, ...props }) => <p style={{ margin: '0.5rem 0' }} {...props} />,
                                                        ul: ({ node, ...props }) => <ul style={{ marginLeft: '1.5rem', marginTop: '0.5rem' }} {...props} />,
                                                        ol: ({ node, ...props }) => <ol style={{ marginLeft: '1.5rem', marginTop: '0.5rem' }} {...props} />,
                                                        li: ({ node, ...props }) => <li style={{ marginBottom: '0.25rem' }} {...props} />,
                                                        code: ({ node, ...props }: any) =>
                                                            props.inline ? (
                                                                <code style={{
                                                                    background: 'rgba(200, 155, 60, 0.2)',
                                                                    padding: '0.2rem 0.4rem',
                                                                    borderRadius: '3px',
                                                                    fontFamily: 'monospace'
                                                                }} {...props} />
                                                            ) : (
                                                                <code style={{
                                                                    display: 'block',
                                                                    background: 'rgba(200, 155, 60, 0.2)',
                                                                    padding: '0.75rem',
                                                                    borderRadius: '6px',
                                                                    fontFamily: 'monospace',
                                                                    overflowX: 'auto',
                                                                    marginTop: '0.5rem'
                                                                }} {...props} />
                                                            ),
                                                        strong: ({ node, ...props }) => <strong style={{ color: '#c89b3c' }} {...props} />,
                                                        em: ({ node, ...props }) => <em style={{ color: '#5bc0de' }} {...props} />,
                                                    }}
                                                >
                                                    {msg.displayedContent || msg.content}
                                                </ReactMarkdown>
                                                {msg.isTyping && (
                                                    <span className="typing-cursor">▊</span>
                                                )}
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}

                        {loading && (
                            <div className="message assistant">
                                <div className="message-avatar">🤖</div>
                                <div className="message-content">
                                    <div className="typing-indicator">
                                        <span></span>
                                        <span></span>
                                        <span></span>
                                    </div>
                                </div>
                            </div>
                        )}

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
                        <button onClick={sendMessage} disabled={loading || !input.trim()}>
                            {loading ? '⏳' : '📤'}
                        </button>
                    </div>
                </div>
            )}
        </>
    );
};
