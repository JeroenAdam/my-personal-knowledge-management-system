import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { useDropzone } from 'react-dropzone';
import ImageTextareaExtended from './ImageTextareaExtended';

const ImageTextarea = ({ initialText, onTextChange, registerModal, setValue, watch }) => {
  const [text, setText] = useState(initialText); // State to hold the text
  const [newText, setNewText] = useState(initialText);
  const [cursorPosition, setCursorPosition] = useState(0); // State to hold the cursor position
  const apiKey = ''; // Replace with your actual API key
  const fileInputRef = useRef(null); // UseRef to handle the dropzone file reference

  useEffect(() => {
    // Update React Hook Form control with newText whenever it changes
    // console.log("Main component - text changed, value: ", newText)
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
          const uploadedFilename = response.data.trim()+"\n";
          const newContent = insertAtCursor(initialText, uploadedFilename, cursorPosition);
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

  const insertAtCursor = (text, insertText, cursorPosition) => {
    return text.slice(0, cursorPosition) + insertText + text.slice(cursorPosition);
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

  const handleCursorPositionChange = (e) => {
    setCursorPosition(e.target.selectionStart);
  };

  return (
    <div>
      <ImageTextareaExtended
        name="content"
        register={registerModal}
        setValue={setValue}
        watch={watch}
        onTextChange={onTextChange}
        onClick={handleCursorPositionChange}
        onKeyUp={handleCursorPositionChange}
      />
      <div className="drop-zone" {...getRootProps()} onClick={handleClick}>
        <input {...getInputProps()} ref={fileInputRef} />
        <label><i className="pi pi-upload cloud-upload-icon"></i>&nbsp;upload files...</label>
      </div>
    </div>
  );
};

export default ImageTextarea;
