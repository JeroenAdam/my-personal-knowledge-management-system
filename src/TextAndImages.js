import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { useDropzone } from 'react-dropzone';
import { InputTextarea } from 'primereact/inputtextarea';

const TextAndImages = ({ initialText, onTextChange, registerModal, setValue }) => {
  const [text, setText] = useState(initialText); // State to hold the text
  const [newText, setNewText] = useState(initialText);
  const apiKey = 'supersecret'; // Replace with your actual API key
  const fileInputRef = useRef(null); // UseRef to handle the dropzone file reference

  useEffect(() => {
    // Update React Hook Form control with newText whenever it changes
    registerModal('content', newText );
  }, [newText]);

  const onDrop = (acceptedFiles) => {
    const file = acceptedFiles[0];
    if (!file) return;

    try {
      const formData = new FormData();
      formData.append('file', file); // Use 'file' as the key for formData

      axios.post('http://localhost:8080/api/v1/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'X-API-KEY': apiKey,
        },
        responseType: 'text', // Specify response type as text
      }).then(response => {
        if (response.status === 200) {
          const uploadedFilename = response.data.trim();
          const newContent = `${initialText} ${uploadedFilename}`;
          setNewText(newContent); // Update local state with new text
          const e = {target: {value: newContent}};
          handleTextChange(e);
        } else {
          throw new Error('Failed to upload image');
        }
      }).catch(error => {
        console.error('Upload error:', error);
      });
    } catch (error) {
      console.error('Error preparing upload:', error);
    }
  };

  const { getRootProps, getInputProps } = useDropzone({
    onDrop, noClick: true, // Prevent default click behavior
  });

  const handleClick = () => {
    fileInputRef.current.click(); // Programmatically click the file input
  };

  const handleTextChange = (e) => {
    const newText = e.target.value;
    setText(newText); // Update state on input change
    onTextChange(newText); // Notify parent component about the text change
    setValue('content', newText); 
  };

  return (
    <div>
      <InputTextarea
        {...registerModal('content', { required: 'Required' })}
        onChange={handleTextChange} // Update state on file upload
        style={{ width: '99%', height: '20vh', borderRadius: '5px', marginTop: '5px' }}
        name="content"
        className="p-inputtext-sm"
        autoResize 
        placeholder="Text"
        rows={10}
      />
      <div className="drop-zone" {...getRootProps()} onClick={handleClick}>
        <input {...getInputProps()} ref={fileInputRef} />
          <label style={{ cursor: 'pointer' }}>Drag 'n' drop images here, or click to select</label>
      </div>      
    </div>
    
  );
};

export default TextAndImages;
