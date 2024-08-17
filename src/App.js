import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import { Accordion, AccordionBody, AccordionHeader, AccordionItem } from 'reactstrap';
import { useForm } from 'react-hook-form';
import { InputText } from 'primereact/inputtext';
import { Button } from 'primereact/button';
import { Dialog } from 'primereact/dialog';
import { Chips } from 'primereact/chips';
import { ToggleButton } from 'primereact/togglebutton';
import { ContextMenu } from 'primereact/contextmenu';
import moment from 'moment';
import Linkify from 'react-linkify';
import ImageTextarea from './ImageTextarea';
import CustomNavbar from './CustomNavbar';
import DiffViewer from 'react-diff-viewer';
import ElasticsearchAPIConnector from '@elastic/search-ui-elasticsearch-connector';
import {
  ErrorBoundary,
  Facet,
  SearchProvider,
  SearchBox,
  Results,
  PagingInfo,
  ResultsPerPage,
  Paging,
  Sorting,
  WithSearch,
} from '@elastic/react-search-ui';
import { Layout, Paging as PagingView, ResultsPerPage as ResultsPerPageView } from '@elastic/react-search-ui-views';

import 'primereact/resources/themes/lara-light-indigo/theme.css';
import 'primereact/resources/primereact.min.css';
import 'primeicons/primeicons.css';
import 'primeflex/primeflex.css';

function debounce(func, delay) {
  let timer;
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => func.apply(this, args), delay);
  };
}

function App() {
  const backendUrl = 'http://localhost:8080/api/v1/notes';
  const publicUrl = 'http://localhost:3000';
  const apiKey = '';
  const [notes, setNotes] = useState([]);
  const [isVisible, setIsVisible] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const { reset: resetModalForm, register: registerModal, handleSubmit: handleSubmitModal, setValue, watch } = useForm();
  const date = moment().format('yyyy-MM-DDTHH:mm:ss');
  const [tags, setTags] = useState([]);
  const [filteredNotes, setFilteredNotes] = useState([]);
  const [selectedTag, setSelectedTag] = useState(null);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isSingleNote, setIsSingleNote] = useState(false);
  const [needRerender, setNeedRerender] = useState(0);
  const [displayDraft, setDisplayDraft] = useState(false);
  const [displayDeleted, setDisplayDeleted] = useState(false);
  const [isVisibleDiff, setIsVisibleDiff] = useState(false);

  useEffect(() => {
    setIsDarkMode(true);
    fetchNotes();
  }, []);

  useEffect(() => {
    document.body.classList.toggle('dark-mode', isDarkMode);
  }, [isDarkMode]);
  
  const fetchNotes = async () => {
    try {
      let url = backendUrl;
      url = displayDraft ? `${backendUrl}?status=DRAFT` : url;
      url = displayDeleted && selectedTag == "I worked on" ? `${backendUrl}?status=DELETED` : url;
      url = !displayDeleted && selectedTag == "I worked on" ? backendUrl : url;
      const res = await axios.get(url, { headers: { 'X-API-KEY': apiKey } });
      setNotes(res.data);
      setFilteredNotes(res.data);
    } catch (error) {
      console.error('Error fetching notes:', error);
    }
  };

  const fetchOneNote = async (id) => {
    if (isSingleNote) {
      try {
        const res = await axios.get(backendUrl+"/"+id, { headers: { 'X-API-KEY': apiKey } });
        setIsSingleNote(false);
        filterSingleNote([res.data]);
        setSelectedTag(null);
      } catch (error) {
        console.error('Error fetching note:', error);
      }
    }
  };

  useEffect(() => {
    fetchNotes();
  }, [displayDraft, displayDeleted]); 

  useEffect(() => {
    window.addEventListener('hashchange', loadNoteFromURL);
    loadNoteFromURL(); // Load note on initial render

    return () => {
      window.removeEventListener('hashchange', loadNoteFromURL);
    };
  }, [needRerender]);

  const filterNotesByTag = (tag, notesToFilter) => {
    const filtered = tag ? notesToFilter.filter(note => note.tags.some(t => t.label === tag)) : notesToFilter;
    setFilteredNotes(filtered);
  };

  const filterSingleNote = (note) => {
    setFilteredNotes(note);
    window.history.pushState(null, null, publicUrl);
  };

  const [lastSavedText, setLastSavedText] = useState('');

  const submit = async (data) => {
    if (data.title.includes('[DRAFT]')) { data.status = 'DRAFT' }
    if (!data.title.includes('[DELETED]') && !data.title.includes('[DRAFT]') && (data.status == 'DELETED' || data.status == 'DRAFT')) { data.status = 'ACTIVE' }
    const noteData = {
      ...data,
      updateDate: date,
      tags: tags.map(tag => ({ label: tag })),
    };
    try {
      let res;
      if (isEditMode) {
        res = await axios.put(`${backendUrl}/${data.id}`, noteData, { headers: { 'X-API-KEY': apiKey } });
        const updatedNotes = notes.map(n => (n.id === data.id ? res.data : n));
        setNotes(updatedNotes);
        filterNotesByTag(selectedTag, updatedNotes); 
      } else {
        res = await axios.post(backendUrl, noteData, { headers: { 'X-API-KEY': apiKey } });
        const updatedNotes = [...notes, res.data];
        setNotes(updatedNotes);
        filterNotesByTag(selectedTag, updatedNotes);
        noteData.id = res.data.id;
        setLastSavedText(noteData.content); // Update the last saved text after save
      }
      // Prefix the title and ID of the current note to note 1's content
      const newNotePrefixed = `☕︎ ${noteData.title} : ${publicUrl}/#note-${noteData.id}`;
      const currentNote1Lines = note1Content.split('\n').filter(line => line.trim() !== newNotePrefixed); // Remove duplicates
      const newNote1Lines = [newNotePrefixed, ...currentNote1Lines].slice(0, 10); // Keep only the first 10 lines
      const newNote1Content = newNote1Lines.join('\n');
      setNote1Content(newNote1Content);
      updateNote1InFilteredNotes(newNote1Content);
      await axios.put(`${backendUrl}/1`, { id: 1, title: "I worked on", content: newNote1Content }, { headers: { 'X-API-KEY': apiKey } });
    } catch (error) {
      console.error('Error adding/editing note:', error);
    }
    resetModalForm({ title: '', content: '', tags: [] });
    setTags([]);
    setIsVisible(false);
    setIsEditMode(false);
    if (displayDeleted) {fetchNotes();}
    // Redirect to Home if filtering by note (needRerender) or tag. On main page rerender already triggered, no scroll
    if (needRerender != 0) {clearFilter();scrollToTop();fetchNotes()};
    if (selectedTag != null) {clearFilter();scrollToTop();setSelectedTag(null);fetchNotes();};
  };

  const handleToggleDiff = () => {
    setIsVisibleDiff(!isVisibleDiff);
  };

  const currentText = watch('content');
  
  const handleEditNote = async id => {
    history.current = []; //clear the undo history
    setIsVisible(true);
    setIsEditMode(true);
    let notes = filteredNotes;
    const note = notes.find(n => n.id === id);
    const noteTags = note.tags.map(tag => tag.label);
    setTags(noteTags);
    resetModalForm(note);
    setLastSavedText(note.content);
    if (id) {setText(note.content); history.current.push(note.content); setCurrentIndex(0); } // set initial text for undo history
  };  

  const handleDeleteNote = async (id) => {
    const noteToDelete = filteredNotes.find(n => n.id === id);
    if (!noteToDelete) { throw new Error('Note not found'); }
    // hard delete
    if (noteToDelete.status == 'DELETED') {
      try {
        // Remove the note's reference from note 1
        const noteReferenceToRemove = `${publicUrl}/#note-${noteToDelete.id}`;
        const updatedNote1Content = note1Content.split('\n').filter(line => !line.includes(noteReferenceToRemove)).join('\n');
        setNote1Content(updatedNote1Content);
        await axios.put(`${backendUrl}/1`, { id: 1, title: "I worked on", content: updatedNote1Content }, { headers: { 'X-API-KEY': apiKey } });
        await axios.delete(`${backendUrl}/${id}`, { headers: { 'X-API-KEY': apiKey } });
        const updatedNotes = notes.filter(note => note.id !== id);
        setNotes(updatedNotes);
        filterNotesByTag(selectedTag, updatedNotes);
      } catch (error) {
        console.error('Error deleting note:', error);
      }
      if (displayDeleted) {fetchNotes();}
      return;
    }
    // soft delete
    const tags = noteToDelete.tags.map(tag => tag.label);
    console.log(tags);
    const updatedNote = { ...noteToDelete, title: '[DELETED] '+noteToDelete.title, status: 'DELETED', updateDate: date, tags: tags.map(tag => ({ label: tag })) };
    try {
      const res = await axios.put(`${backendUrl}/${id}`, updatedNote, { headers: { 'X-API-KEY': apiKey } });
      const updatedNotes = notes.filter(note => note.id !== id);
      setNotes(updatedNotes);
      filterNotesByTag(selectedTag, updatedNotes);
    } catch (error) {
      console.error('Error deleting note:', error);
    }
    if (displayDeleted) {fetchNotes();}
  };

  const [showScroll, setShowScroll] = useState(false);

  const handleScroll = () => {
    const scrollTop = window.scrollY;
    setShowScroll(scrollTop > 150);
  };

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };

  useEffect(() => {
    window.addEventListener('scroll', handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  const handleTagClick = (tag) => {
    setSelectedTag(tag);
    setDisplayDeleted(false);
    setFilteredNotes(notes.filter(note => note.tags.some(t => t.label === tag)));
    // console.log("handletagclick function: filtering by", tag, filteredNotes)
    scrollToTop();
  };

  const clearFilter = () => {
    setSelectedTag(null);
    setNeedRerender(0);
    setFilteredNotes(notes);
    const hash = window.location.hash;
    if (hash.startsWith('#note-')) {
      window.location.replace(publicUrl);
    } 
  };

  const handleThemeChange = () => {
    setIsDarkMode(!isDarkMode);
  };

  const linkDecorator = (href, text, key) => {
    const encodedHref = encodeURI(href);
    if (/\.(png|jpg|jpeg|gif|webp)$/i.test(href)) {
      return (
        <img className="images" src={encodedHref} alt={text} key={key} />  
      );
    } else if (/\.(mp4|webm)$/i.test(encodedHref)) {
      return (
        <video className="images" controls key={key}>
          <source src={encodedHref} type={`video/${href.split('.').pop()}`} />
        </video>
      );
    } else if (/\.(mp3)$/i.test(encodedHref)) {
      return (
        <audio controls key={key}>
          <source src={encodedHref} type="audio/mpeg" />
        </audio>
      );
    }
    if (href.includes(publicUrl + "/#note-")) {
      const parts = href.split("#note-");
      const noteId = parts[1];
      return (
        <a href={encodedHref} key={key}>
          {"#"+noteId}
        </a>
      );
    }
    if (href.includes(publicUrl)) {
      return (
        <a href={encodedHref} key={key}>
          {text}
        </a>
      );
    }
    return (
      <a href={encodedHref} key={key} target="_blank" rel="noopener noreferrer">
        {text}
      </a>
    );
  };

  const loadNoteFromURL = () => {
    const hash = window.location.hash;
    if (hash.startsWith('#note-')) {
      const noteId = parseInt(hash.replace('#note-', ''), 10);
      setIsSingleNote(true);
      fetchOneNote(noteId);
      setNeedRerender(noteId);
      // console.log("id of last note:", needRerender, "compared to current from url: ", noteId);
      return;
    }   
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text).then(() => { }).catch(err => {
      console.error('Could not copy text: ', err);
    });
  };

  const [text, setText] = useState('');

  const history = useRef([]);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const isUndoing = useRef(false); // New flag to track undo state

  const updateText = useCallback((newText) => {
    if (newText == null) {
      return;
    }

    if (isUndoing.current) {
      isUndoing.current = false;
      return;
    }

    const words = newText.trim().split(/\s+/);
    const currentWords = text.trim().split(/\s+/);

    if (words.length !== currentWords.length) {
      setText(newText);
      // console.log("The main app has received and set new text", newText)

      if (currentIndex < history.current.length - 1) {
        history.current = history.current.slice(0, currentIndex + 1);
      }

      history.current.push(newText);
      setCurrentIndex(currentIndex + 1);
      // console.log("index ", currentIndex + 1, ", text pushed: ", newText); 
    }
  }, [text, currentIndex]);

  const debouncedUpdateText = useCallback(debounce(updateText, 300), [updateText]);

  const handleUndo = () => {
    if (currentIndex > 0) {
      // isUndoing.current = true; Set the flag before undoing
      setCurrentIndex(currentIndex - 1);
      setText(history.current[currentIndex - 1]);
    }
  };

  const handleRedo = () => {
    if (currentIndex < history.current.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setText(history.current[currentIndex + 1]);
    }
  };

  const connector = new ElasticsearchAPIConnector({
    host: 'host',
    index: 'index',
    apiKey: '',
  });

  const config = {
    /* debug: true, */
    searchQuery: {
      search_fields: {
        title: { weight: 3 },
        content: {},
      },
      result_fields: {
        id: {},
        title: { snippet: { size: 100 } },
      },  
    },
    apiConnector: connector,
  };

  const sidebarNote = filteredNotes;
  const allTags = sidebarNote.reduce((acc, note) => {
    note.tags.forEach(tag => {
      if (!acc.some(t => t.label === tag.label)) {
        acc.push(tag);
      }
    });
    return acc;
  }, []);
  
  const enhanceNoteText = (text) => {
    const applyInlineFormatting = (text) => { // Helper function to apply inline formatting e.g. for header lines and list item lines
      const inlineRegex = /(\*\*[^*]+\*\*|__[^_]+__)/g;
      const parts = text.split(inlineRegex);
      return parts.map((part, index) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return <strong key={index}>{part.slice(2, -2)}</strong>;
        } else if (part.startsWith('__') && part.endsWith('__')) {
          return <span key={index} style={{ textDecoration: 'underline' }}>{part.slice(2, -2)}</span>;
        }
        return part;
      });
    };
    const regex = /(```[\s\S]*?```|---|#{1,6}\s[^\n]+|^\s*[-*]\s[^\n]+(?:\n|$))/gm; // capture different Markdown-like formats
    const parts = text.split(regex).filter(part => part && part.trim() !== '');
    return parts.map((part, index) => {
      if (typeof part !== 'string') return null;
      if (part.trim() === '---') {
        return <hr key={index} />;
      }
      if (part.startsWith('```') && part.endsWith('```')) {
        const codeContent = part.slice(3, -3).trim();
        return (
          <pre key={index} className="code-block">
            <code>{codeContent}</code>
          </pre>
        );
      }
      else if (part.match(/^#{1,6}\s/)) {
        const headerMatch = part.match(/^(#{1,6})\s+(.*)$/);
        if (headerMatch) {
          const headerLevel = headerMatch[1].length;
          return React.createElement(`h${headerLevel}`, { key: index }, applyInlineFormatting(headerMatch[2].trim()));
        }
      }
      else if (part.match(/^\s*[-*]\s/)) { // list items only if at the beginning of a line
        const trimmedPart = part.trimStart();
        return <li key={index}>{applyInlineFormatting(trimmedPart.slice(trimmedPart.indexOf(' ') + 1).trim())}</li>;
      }
      return <span key={index}>{applyInlineFormatting(part)}</span>;
    });
  };

  const [openIds, setOpenIds] = useState({});
  const [showMoreIds, setShowMoreIds] = useState({});
  const allNotesOpenRef = useRef(true); 
  const [allOpen, setAllOpen] = useState(true);

  // Set all notes to open by default
  useEffect(() => {
    const initialOpenIds = filteredNotes.reduce((acc, note, i) => {
      acc[`entity-${i}`] = allNotesOpenRef.current;
      return acc;
    }, {});
    setOpenIds(initialOpenIds);
  }, [filteredNotes]);

  const toggle = (id) => {
    setOpenIds((prevState) => ({
      ...prevState,
      [id]: !prevState[id]
    }));
  };

  const toggleShowMore = (id) => {
    setShowMoreIds((prevState) => ({
      ...prevState,
      [id]: !prevState[id]
    }));
  };

  const toggleAllNotes = () => {
    allNotesOpenRef.current = !allNotesOpenRef.current;
    setOpenIds(prevState => {
      const newOpenIds = { ...prevState };
      filteredNotes.forEach((note, i) => {
        newOpenIds[`entity-${i}`] = allNotesOpenRef.current;
      });
      return newOpenIds;
    });
  };

  const handleDraftClick = () => {
    const currentTitle = watch('title');
    if (!currentTitle.startsWith('[DRAFT]')) {
      setValue('title', '[DRAFT] ' + currentTitle);
    }
  };

  const handleArchivedClick = () => {
    const currentTitle = watch('title');
    if (!currentTitle.startsWith('[ARCHIVED]')) {
      setValue('title', '[ARCHIVED] ' + currentTitle);
    }
  };

  const cm = useRef(null);

  const contextMenuItems = [
    {
      label: 'Draft',
      icon: 'pi pi-fw pi-file',
      style: { transform: 'Scale(0.9)'},
      command: () => {
        handleDraftClick();
      }
    },
    {
      label: 'Archived',
      icon: 'pi pi-fw pi-box',
      style: { transform: 'Scale(0.9)'},
      command: () => {
        handleArchivedClick();
      }
    }
  ];

  const CustomHeaderWithMenu = ({ label, contextMenuItems, handleUndo, handleRedo, currentIndex, historyLength, lastSavedText }) => {
  
    return (
      <div className="custom-header-items">
        <span>{label}</span>
        <button className="undoredo firsticon" onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleUndo() }}
                disabled={currentIndex <= 0 || text === lastSavedText || text === "" }><i className="pi pi-undo"></i></button>
        <button className="undoredo" onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleRedo() }} disabled={currentIndex >= historyLength - 1}><i className="pi pi-refresh"></i></button>
        <span className="custom-header-menu-status" onClick={(e) => cm.current.show(e)}><i className="pi pi-bars"></i></span>
        <ContextMenu model={contextMenuItems} ref={cm} />
      </div>
    );
  };

  // Add or remove the no-scroll-if-dialog class to the body element when the dialog visibility changes
  useEffect(() => {
    if (isVisible) {
      document.body.classList.add('no-scroll-if-dialog');
    } else {
      document.body.classList.remove('no-scroll-if-dialog');
    }
    return () => {
      document.body.classList.remove('no-scroll-if-dialog');
    };
  }, [isVisible]);

  const [note1Content, setNote1Content] = useState('');

  useEffect(() => {
    // Fetch the content of note with ID 1 on initial page load
    const fetchNote1Content = async () => {
      try {
        const res = await axios.get(`${backendUrl}/1`, { headers: { 'X-API-KEY': apiKey } });
        setNote1Content(res.data.content);
      } catch (error) {
        console.error('Error fetching note 1:', error);
      }
    };
    fetchNote1Content();
  }, []);

  const updateNote1InFilteredNotes = (newContent) => {
    setFilteredNotes(prevNotes =>
      prevNotes.map(note =>
        note.id === 1 ? { ...note, content: newContent } : note
      )
    );
  };

  const diffViewerStyles = {
    variables: {
      dark: {
        diffViewerBackground: '#2b2b2b',
        diffViewerColor: '#FFF',
        addedBackground: '#014642',
        addedColor: 'white',
        removedBackground: '#602a23',
        removedColor: 'white',
        wordAddedBackground: '#025856',
        wordRemovedBackground: '#7a332e',
        addedGutterBackground: '#003c37',
        removedGutterBackground: '#60261f',
        gutterBackground: '#292a29',
        gutterBackgroundDark: '#232422',
        highlightBackground: '#273456',
        highlightGutterBackground: '#2a3b66',
        codeFoldGutterBackground: '#1e1e1a',
        codeFoldBackground: '#232320',
        emptyLineBackground: '#333435',
        gutterColor: '#434756',
        addedGutterColor: '#8c8c8c',
        removedGutterColor: '#8c8c8c',
        codeFoldContentColor: '#c7d2fe',
        diffViewerTitleBackground: '#2c2d2d',
        diffViewerTitleColor: '#555a7b',
        diffViewerTitleBorderColor: '#323335',
      },
    },
    lineNumber: {
      color: '#aaa'
    },
    line: {
      '&:hover': {
        background: '#333',
      },
    },
  };

  return (  
    <div className="container">
     <div className="main"><br></br>
      <header>
       <button onClick={() => { setDisplayDeleted(false); handleTagClick("I worked on") }} disabled={selectedTag=="I worked on"}
        className="home pi pi-home"></button>
       <h2>Welcome back, Jeroen</h2>
       <label style={{ marginTop: '4px' }}className="theme-switch">
          <input type="checkbox" checked={isDarkMode} onChange={handleThemeChange} />
          <span className="slider round"></span>
       </label></header><br></br>
       { /* selectedTag !== "I worked on" && (
         <SearchProvider config={config}>
         <SearchBox
              className="searchlabel show-cancel-button"
              inputProps={{ key: 'password', placeholder: 'Search...', id: 'search', type: 'search' }}
              autocompleteMinimumCharacters={3}
             autocompleteSuggestions={false}
              searchAsYouType
            />
           </SearchProvider>
         )
         */ }
      <Button
        label="Add Note"
        icon="pi pi-plus"
        outlined
        onClick={(e) => {
          history.current = []; history.current.push(""); setCurrentIndex(0); //prepare the undo history
          setText("");
          setIsVisible(true)
        }}
        style={{ width: '90%', position: 'relative', left: '14px' }}
      />
      <ToggleButton className="toggle" disabled={selectedTag=="I worked on"} checked={displayDraft} onChange={e => setDisplayDraft(e.value)}
        onLabel="" offLabel="" onIcon="pi pi-file" offIcon="pi pi-file-check"></ToggleButton >    
      <br></br><br></br>
      {selectedTag && selectedTag !== "I worked on" && (
        <div>
          <Button icon="pi pi-filter-slash" style={{ width: '96%', position: 'relative', left: '14px', border: "2px solid white" }} label="Clear Filter" onClick={clearFilter} />
          <h4>&nbsp;&nbsp;&nbsp;&nbsp;{'Filtering by tag:'} {selectedTag}</h4><br></br>
        </div>
      )}
      {needRerender !== 0 && !selectedTag && (
        <div>
          <Button icon="pi pi-filter-slash" style={{ width: '96%', position: 'relative', left: '14px', border: "2px solid white" }} label="Clear Filter" onClick={clearFilter} />
          <h4>&nbsp;&nbsp;&nbsp;&nbsp;{needRerender && 'Filtering note by id: '+needRerender}  </h4><br></br>
        </div>
      )}      
      <Dialog
        header={<CustomHeaderWithMenu label={isEditMode ? "Edit note" : "Create note"}
                  contextMenuItems={contextMenuItems} handleUndo={handleUndo} handleRedo={handleRedo} currentIndex={currentIndex} historyLength={history.current.length} lastSavedText={lastSavedText} />}
                  visible={isVisible}
                  onHide={() => {
                    setIsVisible(false);
                    setTags([]);
                    setIsEditMode(false);
                    resetModalForm({ title: '', content: '' });
                    setText("");
                  }}
                >
        <form onSubmit={handleSubmitModal(submit)}>
          <InputText
            style={{ width: '99%', borderRadius: '5px', marginTop: '4px', marginBottom: '4px' }}
            name="title"
            placeholder="Title"
            {...registerModal('title', { required: 'Required' })}
            className="p-inputtext-sm"
          />         
          <ImageTextarea initialText={text} setValue={setValue} onTextChange={debouncedUpdateText} register={registerModal} watch={watch}/> 
          <Chips
            style={{ width: '99%', borderRadius: '5px', marginTop: '4px' }}
            value={tags}
            onChange={(e) => setTags(e.value)}
            separator=","
            placeholder="Add tags"
            className="p-chips-input-token"
          />
          <Button style={{ marginTop: '18px' }} size="small" type="submit" label="Save" />&nbsp;&nbsp;
          <Button className="showdiff" unstyled tooltip='show diff' icon="pi pi-arrow-right-arrow-left" type="button"
                  onClick={handleToggleDiff} />
        </form>
        {isVisibleDiff && (
          <Dialog contentClassName="diff" headerClassName="diff"
          style={{ fontSize: '0.8rem', width: '100vw', height: '100vh', maxWidth: '1880px', overflowY: 'scroll' }}
            visible={isVisibleDiff}
            onHide={() => setIsVisibleDiff(false)}>
            <DiffViewer
            useDarkTheme
            styles={diffViewerStyles}
            oldValue={lastSavedText}
            newValue={currentText}
            splitView={true}
            disableWordDiff={false}
            />
          </Dialog>
        )}
      </Dialog>
      <CustomNavbar selectedTag={selectedTag} scrollToTop={scrollToTop} clearFilter={clearFilter} setDisplayDeleted={setDisplayDeleted} displayDeleted={displayDeleted}
      ></CustomNavbar>
      <Accordion open={allNotesOpenRef.current} toggle={toggle} toggleShowMore={toggleShowMore} flush>
      {filteredNotes.map((note, i) => {
        const id = `entity-${i}`;
        const isOpen = !!openIds[id];
        const showMore = !!showMoreIds[id];

        return (
          <AccordionItem key={id}>
            <AccordionHeader
              style={note.status === 'DELETED' ? {
                borderTop: '1px solid red',
                borderLeft: '1px solid red',
                borderRight: '1px solid red',
                borderTopLeftRadius: '6px',
                borderTopRightRadius: '6px'
              } : {}}
              className="notes-accordion-button"
              onClick={() => toggle(id)}
            >
              <div className="notes-accordion-button">
                <span
                  className="notes-header-edit"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleEditNote(note.id);
                  }}
                >
                  <i className="pi pi-pencil"></i>
                </span>
                <span style={{ marginLeft: '0.5rem' }}>{note.title}</span>
                <span
                  style={{ marginLeft: '0.75rem', cursor: 'pointer' }}
                  className="notes-header-link"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    copyToClipboard(publicUrl + "/#note-" + note.id);
                  }}
                >
                  <i className="pi pi-link"></i>
                </span>
                <span
                  className="notes-header-delete"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const isDeleted = note.status === 'DELETED';
                    const confirmMessage = isDeleted
                      ? `Are you sure you want to permanently delete "${note.title}"?\nThis action cannot be undone.`
                      : `Are you sure you want to delete "${note.title}"?\nIt will be moved to the recycle bin.`;
                    const confirm = window.confirm(confirmMessage);
                    if (!confirm) return;
                    handleDeleteNote(note.id);
                  }}
                ></span>
                {note.linked && note.linked.map(linked => (
                  linked.referrer && (
                    <a
                      style={{ marginLeft: 'auto', opacity: '0.5', cursor: 'pointer', textDecoration: 'underline' }}
                      key={`linked-${linked.id}`}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        window.location.replace(publicUrl + "/#note-" + linked.referrer.id);
                      }}
                    >
                      <i style={{ color: '#FFF', marginRight: '4px', height: '22px' }} className="pi pi-undo"></i>
                      <span key={linked.id}>{linked.referrer.title}</span>
                    </a>
                  )
                ))}
              </div>
            </AccordionHeader>

            {isOpen && (
              <AccordionBody
                style={note.status === 'DELETED' ? {
                  borderBottom: '1px solid red',
                  borderLeft: '1px solid red',
                  borderRight: '1px solid red',
                  borderBottomLeftRadius: '6px',
                  borderBottomRightRadius: '6px',
                  maxHeight: showMore ? 'none' : '275px',
                  overflow: 'hidden',
                  position: 'relative'
                } : {
                  maxHeight: showMore ? 'none' : '275px',
                  overflow: 'hidden',
                  position: 'relative'
                }}
                className="notes-menu-accordion-body note-content"
              >
                <Linkify componentDecorator={linkDecorator}>
                  {note.content ? enhanceNoteText(note.content) : ''}
                  <span style={{ opacity: 0.45, fontWeight: 300 }}>
                    <p></p>
                    {note.updateDate && note.title !== "I worked on" ? "Last updated: " + note.updateDate.split('.')[0].replace('T', ' ').slice(0, 16) : ''}
                  </span>
                </Linkify>
                <div className="badges" style={{ marginTop: '15px', display: 'flex', flexWrap: 'wrap', gap: '1px', width: '100%' }}>
                  {selectedTag === "I worked on" && note.tags.map(tag => (
                    <a key={`tag-${tag.id}`}>
                      <span className="badge disabled bg-light rounded-pill" key={tag.id}>{tag.label}</span>
                    </a>
                  ))}
                  {selectedTag !== "I worked on" && note.tags.map(tag => (
                    <a key={`tag-${tag.id}`} onClick={() => handleTagClick(tag.label)}>
                      <span className="badge bg-light rounded-pill" key={tag.id}>{tag.label}</span>
                    </a>
                  ))}
                </div>
                {!showMore && (
                  <div className="showmore" style={{ bottom: -13 }}>
                    <button style={{ border: 0, paddingTop: '11px', paddingLeft: '20px', paddingRight: '20px', position: 'relative',
                    top: '-10px', verticalAlign: 'top', cursor: 'pointer', backgroundColor: 'transparent', color: 'white' }}
                    onClick={() => toggleShowMore(id)}><i className="pi pi-chevron-down"></i></button>
                  </div>
                )}
                {showMore && (
                  <div className="showless">
                    <button style={{ border: 0, paddingTop: '10px', paddingBottom: '21px', paddingLeft: '20px', paddingRight: '20px',
                    position: 'relative', bottom: '-9px', cursor: 'pointer', backgroundColor: 'transparent', color: 'white' }}
                    onClick={() => toggleShowMore(id)}><i className="pi pi-chevron-up"></i></button>
                  </div>
                )}
              </AccordionBody>
            )}
          </AccordionItem>
        );
      })}
    </Accordion>
      <br></br>
      {showScroll && (
        <center><button onClick={scrollToTop} className="scroll-to-top">
          <i className="pi pi-chevron-up"></i></button></center>
        )
      }
      <br></br><br></br><center><p>Contact the <a href="https://www.adambahri.com/contact" target="_blank" rel="noopener noreferrer">
      <span className='footer-link'>author</span></a> of this app</p></center>
      </div>
      {selectedTag != "I worked on" && (
        <div className="sidebar">
          <span className="toggle-all-notes" onClick={toggleAllNotes}>
            {allNotesOpenRef.current ? 'Fold All Notes' : 'Unfold All Notes'}
          </span><br></br>
          <label className="related-tags-label">&nbsp;&nbsp;&nbsp;Related tags:</label>
          <div className="related-tags">
            {allTags.map(tag => (
              <a key={`sidebar-tag-${tag.id}`} onClick={() => handleTagClick(tag.label)}>
                <span className="badge bg-light rounded-pill">{tag.label}</span>
              </a>
            ))}
          </div>
        </div>
      )}
      </div>
  );
}

export default App;