import { useState } from 'react';
import { ChevronDown, ChevronUp, Heart, Mail, ExternalLink, Github } from 'lucide-react';

interface FooterProps {
    showShortcuts?: boolean;
    compact?: boolean;
}

export function Footer({ showShortcuts = true, compact = false }: FooterProps) {
    const [expanded, setExpanded] = useState(false);

    if (compact) {
        return (
            <footer className="text-center mt-6">
                <p className="text-theme-text-muted text-xs">
                    Made with <Heart className="w-3 h-3 inline text-red-400" /> by{' '}
                    <a
                        href="https://arthals.ink"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-theme-text-secondary hover:text-theme-accent transition-colors">
                        卓致用
                    </a>
                    <span className="mx-1.5 text-theme-border">·</span>
                    <span className="text-theme-text-muted">21 级预防&信双</span>
                </p>
            </footer>
        );
    }

    return (
        <footer className="mt-6 space-y-3">
            {showShortcuts && (
                <div className="text-theme-text-muted text-xs text-center space-y-1.5">
                    <p className="inline-flex items-center gap-1.5 justify-center">
                        <kbd className="px-1.5 py-0.5 text-[10px] bg-theme-elevated border border-theme-border rounded">
                            1-5
                        </kbd>
                        <span>或</span>
                        <kbd className="px-1.5 py-0.5 text-[10px] bg-theme-elevated border border-theme-border rounded">
                            ASDFG
                        </kbd>
                        <span>选择</span>
                        <span className="mx-1 text-theme-border hidden sm:inline">·</span>
                    </p>
                    <p className="inline-flex items-center gap-1.5 justify-center">
                        <kbd className="px-1.5 py-0.5 text-[10px] bg-theme-elevated border border-theme-border rounded">
                            ← →
                        </kbd>
                        <span>切换</span>
                        <span className="mx-1 text-theme-border">·</span>
                        <kbd className="px-1.5 py-0.5 text-[10px] bg-theme-elevated border border-theme-border rounded">
                            Space
                        </kbd>
                        <span>下一题/跳过</span>
                    </p>
                </div>
            )}

            <div className="text-center">
                <button
                    onClick={() => setExpanded(!expanded)}
                    className="inline-flex items-center gap-1 text-xs text-theme-text-muted hover:text-theme-text-secondary transition-colors">
                    <span>关于本站</span>
                    {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </button>
            </div>

            <div
                className={`overflow-hidden transition-all duration-300 ease-in-out ${
                    expanded ? 'max-h-48 opacity-100' : 'max-h-0 opacity-0'
                }`}>
                <div className="border border-theme-border rounded-lg bg-theme-elevated/50 p-4 space-y-3">
                    <div className="flex items-center justify-center gap-2 text-xs">
                        <Heart className="w-3 h-3 text-red-400" />
                        <span className="text-theme-text-secondary">
                            网站制作：21 级预防&信双{' '}
                            <a
                                href="https://arthals.ink"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-theme-accent hover:underline">
                                卓致用
                            </a>
                        </span>
                    </div>

                    <div className="flex items-center justify-center gap-2 text-xs">
                        <Mail className="w-3 h-3 text-theme-text-muted" />
                        <span className="text-theme-text-secondary">
                            投稿题目：
                            <a
                                href="mailto:zhuozhiyongde@126.com"
                                className="text-theme-accent hover:underline font-mono text-[11px]">
                                zhuozhiyongde@126.com
                            </a>
                        </span>
                    </div>

                    <div className="flex items-center justify-center gap-2 text-xs">
                        <Github className="w-3 h-3 text-theme-text-muted" />
                        <span className="text-theme-text-secondary">
                            网站源码：
                            <a
                                href="https://github.com/zhuozhiyongde/Med-Quiz"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-theme-accent hover:underline">
                                Med-Quiz
                            </a>
                        </span>
                    </div>

                    <div className="pt-2 border-t border-theme-border">
                        <p className="text-[10px] text-theme-text-muted text-center mb-2">我的其他项目</p>
                        <div className="flex items-center justify-center gap-4 text-xs">
                            <a
                                href="https://arthals.ink/post/pku-art"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-theme-text-secondary hover:text-theme-accent transition-colors">
                                <ExternalLink className="w-3 h-3" />
                                PKU Art
                            </a>
                            <a
                                href="https://grade.arthals.ink"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-theme-text-secondary hover:text-theme-accent transition-colors">
                                <ExternalLink className="w-3 h-3" />
                                医学部成绩查询
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        </footer>
    );
}
