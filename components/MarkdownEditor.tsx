import React, { useRef, useCallback } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { EditorView } from '@codemirror/view';
import { markdown, markdownLanguage } from '@codemirror/lang-markdown';
import { languages } from '@codemirror/language-data';
import { openSearchPanel } from '@codemirror/search';
import { FaBold, FaItalic, FaHeading, FaListUl, FaListOl, FaLink, FaImage, FaSearch } from 'react-icons/fa';

interface MarkdownEditorProps {
    value: string;
    onChange: (value: string) => void;
}

const MarkdownEditor: React.FC<MarkdownEditorProps> = ({ value, onChange }) => {
    const editor = useRef<any>();

    const applyStyle = (prefix: string, suffix: string = prefix) => {
        const view = editor.current?.view;
        if (!view) return;
        const { from, to } = view.state.selection.main;
        const selection = view.state.sliceDoc(from, to);
        const newText = `${prefix}${selection}${suffix}`;
        view.dispatch({
            changes: { from, to, insert: newText }
        });
        onChange(view.state.doc.toString());
    };

    const insertText = (text: string) => {
        const view = editor.current?.view;
        if (!view) return;
        const { from } = view.state.selection.main;
        view.dispatch({
            changes: { from, insert: text }
        });
        onChange(view.state.doc.toString());
    };

    const handleBold = () => applyStyle('**');
    const handleItalic = () => applyStyle('*');
    const handleHeading = () => insertText('### ');
    const handleUnorderedList = () => insertText('- ');
    const handleOrderedList = () => insertText('1. ');
    const handleLink = () => applyStyle('[', '](url)');
    const handleImage = () => applyStyle('![', '](url)');

    const handleSearch = () => {
        const view = editor.current?.view;
        if (!view) return;
        openSearchPanel(view);
    };

    const onEditorChange = useCallback((val: string) => {
        onChange(val);
    }, [onChange]);

    return (
        <div className="flex flex-col h-full">
            <div className="bg-slate-100 dark:bg-slate-700 p-2 flex items-center gap-4 rounded-t-md">
                <button onClick={handleBold} title="Bold" className="p-2 rounded hover:bg-slate-200 dark:hover:bg-slate-600"><FaBold /></button>
                <button onClick={handleItalic} title="Italic" className="p-2 rounded hover:bg-slate-200 dark:hover:bg-slate-600"><FaItalic /></button>
                <button onClick={handleHeading} title="Heading" className="p-2 rounded hover:bg-slate-200 dark:hover:bg-slate-600"><FaHeading /></button>
                <button onClick={handleUnorderedList} title="Unordered List" className="p-2 rounded hover:bg-slate-200 dark:hover:bg-slate-600"><FaListUl /></button>
                <button onClick={handleOrderedList} title="Ordered List" className="p-2 rounded hover:bg-slate-200 dark:hover:bg-slate-600"><FaListOl /></button>
                <button onClick={handleLink} title="Link" className="p-2 rounded hover:bg-slate-200 dark:hover:bg-slate-600"><FaLink /></button>
                <button onClick={handleImage} title="Image" className="p-2 rounded hover:bg-slate-200 dark:hover:bg-slate-600"><FaImage /></button>
                <button onClick={handleSearch} title="Search" className="p-2 rounded hover:bg-slate-200 dark:hover:bg-slate-600"><FaSearch /></button>
            </div>
            <CodeMirror
                ref={editor}
                value={value}
                height="100%"
                className="flex-grow"
                extensions={[
                    markdown({ base: markdownLanguage, codeLanguages: languages }),
                    EditorView.theme({
                        '&': {
                            backgroundColor: '#1e293b !important',
                            color: 'white',
                        },
                        '.cm-gutters': {
                            backgroundColor: '#1e293b !important',
                            color: '#94a3b8',
                            border: 'none',
                        },
                        '.cm-activeLineGutter': {
                            backgroundColor: '#334155 !important',
                        },
                        '.cm-scroller': {
                            fontFamily: 'inherit',
                        },
                        '.cm-cursor': {
                            borderLeftColor: 'white',
                        },
                        '&.cm-focused .cm-cursor': {
                            borderLeftColor: 'white',
                        },
                        '.cm-selectionBackground, &.cm-focused .cm-selectionBackground': {
                            backgroundColor: '#475569',
                        },
                        '.cm-searchMatch': {
                            backgroundColor: '#64748b',
                            outline: '1px solid #94a3b8',
                        },
                        '.cm-searchMatch.cm-searchMatch-selected': {
                            backgroundColor: '#94a3b8',
                        },
                    }),
                ]}
                onChange={onEditorChange}
            />
        </div>
    );
};

export default MarkdownEditor;
