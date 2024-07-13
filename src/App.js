import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { UncontrolledAccordion, AccordionBody, AccordionHeader, AccordionItem } from 'reactstrap';
import { useForm } from 'react-hook-form';
import { InputText } from 'primereact/inputtext';
import { InputTextarea } from 'primereact/inputtextarea';
import { Button } from 'primereact/button';
import { Dialog } from 'primereact/dialog';
import moment from 'moment';

import 'primereact/resources/themes/lara-light-indigo/theme.css';
import 'primereact/resources/primereact.min.css';
import 'primeicons/primeicons.css';

function App() {
  const backendUrl = 'http://localhost:8080/api/v1/notes';
  const apiKey = 'supersecret';
  const [notes, setNotes] = useState([]);
  const [isVisible, setIsVisible] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const { reset: resetModalForm, register: registerModal, handleSubmit: handleSubmitModal } = useForm();
  const [open, setOpen] = useState('0');
  const date = moment().format('yyyy-MM-DD');

  useEffect(() => {
    fetchNotes();
  }, []);

  const fetchNotes = async () => {
    try {
      const res = await axios.get(backendUrl, { headers: { 'X-API-KEY': apiKey } });
      setNotes(res.data);
    } catch (error) {
      console.error('Error fetching notes:', error);
    }
  };

  const submit = async (note) => {
    try {
      let res;
      if (isEditMode) {
        res = await axios.put(`${backendUrl}/${note.id}`, {...note, updateDate: date}, { headers: { 'X-API-KEY': apiKey } });
        setNotes(notes.map(n => (n.id === note.id ? res.data : n)));
      } else {
        res = await axios.post(backendUrl, {...note, updateDate: date}, { headers: { 'X-API-KEY': apiKey } });
        setNotes([...notes, res.data]);
      }
    } catch (error) {
      console.error('Error adding/editing note:', error);
    }
    resetModalForm({ title: '', content: '' });
    setIsVisible(false);
    setIsEditMode(false);
  };
  
  const handleEditNote = async id => {
    setIsVisible(true);
    setIsEditMode(true);
    const note = notes.find(n => n.id === id);
    resetModalForm(note);
  };  

  const handleDeleteNote = async (id) => {
    try {
      await axios.delete(`${backendUrl}/${id}`, { headers: { 'X-API-KEY': apiKey } });
      setNotes(notes.filter(note => note.id !== id));
    } catch (error) {
      console.error('Error deleting note:', error);
    }
  }

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

  return (
    <div>
      <h1><center>My Notes</center></h1><br></br>
      <Button
        label="Add Note"
        icon="pi pi-plus"
        outlined
        onClick={() => setIsVisible(true)}
        style={{ width: '100%', backgroundColor:'rgba(255, 255, 255, 0.33)' }}
      /><br></br><br></br>
      <Dialog
        header={isEditMode ? "Edit note" : "Create note"}
        visible={isVisible}
        onHide={() => {
          setIsEditMode(false);
          setIsVisible(false);
          resetModalForm({ title: '', content: '' });
        }}
      >
        <form onSubmit={handleSubmitModal(submit)}>
          <InputText
            style={{ width: '95%', borderRadius: '5px', marginTop: '5px', marginBottom: '5px' }}
            name="title"
            placeholder="Title"
            {...registerModal('title', { required: 'Required' })}
            className="p-inputtext-sm"
          />
          <InputTextarea
            style={{ width: '95%', height: '20vh', borderRadius: '5px', marginTop: '5px' }}
            name="content"
            className="p-inputtext-sm"
            placeholder="Text"
            {...registerModal('content', { required: 'Required' })}
          />
          <Button style={{ marginTop: '28px' }} size="small" type="submit" label="Save" />
        </form>
      </Dialog>

      <UncontrolledAccordion flush open={open} >
        {notes.map((note, i) => (
          <AccordionItem key={`entity-${i}`}>
            <AccordionHeader className="notes-accordion-button" targetId={`entity-${i}`}>
              <div className="notes-accordion-button">
                <span className="notes-header-edit"
                    onClick={() => {
                    handleEditNote(note.id);
                    }}
                ><i className="pi pi-pencil"></i></span>
                <span style={{ marginLeft: '0.5rem' }}>{note.title}</span>
                <span className="notes-header-delete"
                    onClick={() => {
                      const confirm = window.confirm(`Are you sure you want to delete "${note.title}"?`);
                      if (!confirm) return;
                      handleDeleteNote(note.id);
                    }}
                ></span>
              </div>
            </AccordionHeader>
            <AccordionBody className="notes-menu-accordion-body" accordionId={`entity-${i}`}>
              <div>
                {note.content ? note.content : ''} <span style={{ opacity: 0.66 }}>&nbsp;&nbsp;{ note.updateDate ? "Last updated: "+note.updateDate : '' }</span>
              </div>
            </AccordionBody>
          </AccordionItem>
        ))}
      </UncontrolledAccordion>
      <br></br>
      {showScroll && (
        <center><button onClick={scrollToTop} className="scroll-to-top">
          <i className="pi pi-chevron-up"></i></button></center>
        )
      }
      <br></br><br></br><center><p>Contact the <a href="https://www.adambahri.com/contact" target="_blank" rel="noopener noreferrer">
      <span>author</span></a> of this app</p></center>
    </div>
  );
}

export default App;