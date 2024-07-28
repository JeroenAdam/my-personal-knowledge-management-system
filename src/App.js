import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Accordion, AccordionBody, AccordionHeader, AccordionItem } from 'reactstrap';
import { useForm } from 'react-hook-form';
import { InputText } from 'primereact/inputtext';
import { Button } from 'primereact/button';
import { Dialog } from 'primereact/dialog';
import { Chips } from 'primereact/chips';
import { ToggleButton } from 'primereact/togglebutton';
import moment from 'moment';
import Linkify from 'react-linkify';  
import ImageTextarea from './ImageTextarea';
import CustomNavbar from './CustomNavbar';
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
      url = displayDeleted && selectedTag == "Home" ? `${backendUrl}?status=DELETED` : url;
      url = !displayDeleted && selectedTag == "Home" ? backendUrl : url;
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

  const submit = async (data) => {
    if (data.title.includes('[DRAFT]')) { data.status = 'DRAFT' }
    if (!data.title.includes('[DELETED]') && data.status == 'DELETED' && !data.title.includes('[DRAFT]')) { data.status = 'ACTIVE' }
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
      }
    } catch (error) {
      console.error('Error adding/editing note:', error);
    }
    resetModalForm({ title: '', content: '', tags: [] });
    setTags([]);
    setIsVisible(false);
    setIsEditMode(false);
    if (displayDeleted) {fetchNotes();}
  };
  
  const handleEditNote = async id => {
    setIsVisible(true);
    setIsEditMode(true);
    const note = notes.find(n => n.id === id);
    const noteTags = note.tags.map(tag => tag.label);
    setTags(noteTags);
    resetModalForm(note);
    if (id) {setText(note.content)}
  };  

  const handleDeleteNote = async (id) => {
    const noteToDelete = notes.find(n => n.id === id);
    if (!noteToDelete) { throw new Error('Note not found'); }
    // hard delete
    if (noteToDelete.status == 'DELETED') {
      try {
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
  const handleTextChange = (newText) => {
    setText(newText);
    // console.log("The main app has received and set new text", newText)
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
    const regex = /(```[\s\S]*?```|\*\*.*?\*\*|__.*?__)/g;
    const parts = text.split(regex);
  
    return parts.map((part, index) => {
      if (part.startsWith('```') && part.endsWith('```')) {
        const codeContent = part.slice(3, -3).replace(/^\n+|\n+$/g, '').trim();
        return (
          <pre key={index} className="code-block">
            <code>{codeContent}</code>
          </pre>
        );
      } else if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={index}>{part.slice(2, -2)}</strong>;
      } else if (part.startsWith('__') && part.endsWith('__')) {
        return <span key={index} style={{ textDecoration: 'underline' }}>{part.slice(2, -2)}</span>;
      }
      return part;
    });
  };

  const [openIds, setOpenIds] = useState({});

  const toggle = (id) => {
    console.log(id);
    setOpenIds((prevState) => ({
      ...prevState,
      [id]: !prevState[id]
    }));
  };

  const [showMoreIds, setShowMoreIds] = useState({});

  const toggleShowMore = (id) => {
    setShowMoreIds((prevState) => ({
      ...prevState,
      [id]: !prevState[id]
    }));
  };

    // Set all notes to open by default
    useEffect(() => {
      const initialOpenIds = filteredNotes.reduce((acc, note, i) => {
        acc[`entity-${i}`] = true;
        return acc;
      }, {});
      setOpenIds(initialOpenIds);
    }, [filteredNotes]);

  return (  
    <div className="container">
     <div className="main"><br></br>
      <header>
       <button onClick={() => { setDisplayDeleted(false); handleTagClick("Home") }} disabled={selectedTag=="Home"}
        className="home pi pi-home"></button>
       <h2>Welcome back, Jeroen</h2>
       <label style={{ marginTop: '4px' }}className="theme-switch">
          <input type="checkbox" checked={isDarkMode} onChange={handleThemeChange} />
          <span className="slider round"></span>
       </label></header><br></br>
       { /* selectedTag !== "Home" && (
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
          setText("");
          setIsVisible(true)
        }}
        style={{ width: '90%', position: 'relative', left: '14px' }}
      />
      <ToggleButton className="toggle" disabled={selectedTag=="Home"} checked={displayDraft} onChange={e => setDisplayDraft(e.value)}
        onLabel="" offLabel="" onIcon="pi pi-file" offIcon="pi pi-file-check"></ToggleButton >
      <br></br><br></br>
      {selectedTag && selectedTag !== "Home" && (
        <div>
          <Button icon="pi pi-filter-slash" style={{ width: '96%', position: 'relative', left: '14px', border: "2px solid white" }} label="Clear Filter" onClick={clearFilter} />
          <h4>&nbsp;&nbsp;&nbsp;&nbsp;{'Filtering by tag:'} {selectedTag}</h4>
        </div>
      )}
      {needRerender !== 0 && !selectedTag && (
        <div>
          <Button icon="pi pi-filter-slash" style={{ width: '96%', position: 'relative', left: '14px', border: "2px solid white" }} label="Clear Filter" onClick={clearFilter} />
          <h4>&nbsp;&nbsp;&nbsp;&nbsp;{needRerender && 'Filtering note by id: '+needRerender}  </h4>
        </div>
      )}      
      <Dialog
        header={isEditMode ? "Edit note" : "Create note"}
        visible={isVisible}
        onHide={() => {
          setIsEditMode(false);
          setIsVisible(false);
          setTags([]);
          resetModalForm({ title: '', content: '' });
          setText("");
        }}
      >
        <form onSubmit={handleSubmitModal(submit)}>
          <InputText
            style={{ width: '99%', borderRadius: '5px', marginTop: '5px', marginBottom: '5px' }}
            name="title"
            placeholder="Title"
            {...registerModal('title', { required: 'Required' })}
            className="p-inputtext-sm"
          />
          <ImageTextarea initialText={text} setValue={setValue} onTextChange={handleTextChange} registerModal={registerModal} watch={watch}/> 
          <Chips
            style={{ width: '99%', borderRadius: '5px', marginTop: '5px' }}
            value={tags}
            onChange={(e) => setTags(e.value)}
            separator=","
            placeholder="Add tags"
            className="p-chips-input-token"
          />
          <Button style={{ marginTop: '24px' }} size="small" type="submit" label="Save" />
        </form>
      </Dialog>
      <CustomNavbar selectedTag={selectedTag} scrollToTop={scrollToTop} clearFilter={clearFilter} setDisplayDeleted={setDisplayDeleted} displayDeleted={displayDeleted}></CustomNavbar>
      <Accordion toggle={toggle} toggleShowMore={toggleShowMore} flush>
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
                  maxHeight: showMore ? 'none' : '300px',
                  overflow: 'hidden',
                  position: 'relative'
                } : {
                  maxHeight: showMore ? 'none' : '300px',
                  overflow: 'hidden',
                  position: 'relative'
                }}
                className="notes-menu-accordion-body note-content"
              >
                <Linkify componentDecorator={linkDecorator}>
                  {note.content ? enhanceNoteText(note.content) : ''}
                  <span style={{ opacity: 0.4 }}>
                    <p></p>
                    {note.updateDate && note.title !== "Home" ? "Last updated: " + note.updateDate.split('.')[0].replace('T', ' ').slice(0, 16) : ''}
                  </span>
                </Linkify>
                <div style={{ marginTop: '15px', display: 'flex', flexWrap: 'wrap', gap: '1px', width: '100%' }}>
                  {selectedTag === "Home" && note.tags.map(tag => (
                    <a key={`tag-${tag.id}`}>
                      <span className="badge disabled bg-light rounded-pill" key={tag.id}>{tag.label}</span>
                    </a>
                  ))}
                  {selectedTag !== "Home" && note.tags.map(tag => (
                    <a key={`tag-${tag.id}`} onClick={() => handleTagClick(tag.label)}>
                      <span className="badge bg-light rounded-pill" key={tag.id}>{tag.label}</span>
                    </a>
                  ))}
                </div>
                {!showMore && (
                  <div
                    style={{
                      position: 'absolute',
                      bottom: -13,
                      left: 0,
                      right: 0,
                      textAlign: 'center',
                      background: 'linear-gradient(transparent, black)',
                      padding: '10px 0'
                    }}
                  >
                    <button style={{ border: 0, cursor: 'pointer', backgroundColor: 'transparent', color: 'white' }}
                    onClick={() => toggleShowMore(id)}><i className="pi pi-chevron-down"></i></button>
                  </div>
                )}
                {showMore && (
                  <div style={{ textAlign: 'center', padding: '10px 0' }}>
                    <button style={{ border: 0, cursor: 'pointer', backgroundColor: 'transparent', color: 'white' }}
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
      {selectedTag != "Home" && (
        <div className="sidebar"><br></br><label className="related-tags-label">&nbsp;&nbsp;&nbsp;Related tags:</label>
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