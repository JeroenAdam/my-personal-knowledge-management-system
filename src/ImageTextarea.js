import React, { useEffect, useState, useRef } from 'react';
import { InputTextarea } from 'primereact/inputtextarea';
import { useDropzone } from 'react-dropzone';
import axios from 'axios';

const ImageTextarea = ({ apiKey, onTextChange, initialText, register, watch, setValue }) => {
  const [text, setText] = useState(initialText); // State to control the Textarea input
  const [cursorPosition, setCursorPosition] = useState(0); // State to hold the cursor position
  const fileInputRef = useRef(null); // UseRef to handle the dropzone file reference

  const textValue = watch('content');
  const initialTextRef = useRef(initialText); // Ref to track the initial text

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
          const uploadedFilename = response.data.trim() + "\n";
          const newContent = insertAtCursor(text, uploadedFilename, cursorPosition);
          setValue('content', newContent); // Set new value in form, watch & useEffect will take over
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

  // Update parent component when the text changes, for undo functionality
  useEffect(() => {
    if (textValue !== initialTextRef.current) {
      onTextChange(textValue);
    }
    setText(textValue); // Added so that first upload can be embedded in text
  }, [textValue, onTextChange]);

  // Update the text field only when the initialText prop changes
  useEffect(() => {
    if (initialText !== initialTextRef.current) {
      initialTextRef.current = initialText; // Update ref to new initialText
      setValue('content', initialText); // Set new value in form
    }
  }, [initialText, setValue]);

  const { getRootProps, getInputProps } = useDropzone({
    onDrop, 
    noClick: true, // Prevent default click behavior
  });

  const handleClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click(); // Programmatically click the file input
    }
  };

  const handleCursorPositionChange = (e) => {
    setCursorPosition(e.target.selectionStart);
  };

  const insertAtCursor = (text, insertText, cursorPosition) => {
    return text.slice(0, cursorPosition) + insertText + text.slice(cursorPosition);
  };

  const parseText = (text) => {
    const urlRegex = /(https?:\/\/[^\s]+(?:\.png|\.jpg|\.jpeg|\.gif|\.webp))/g;
    const youtubeRegex = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:watch\?v=|shorts\/)|youtu\.be\/)([^\s&]+)(?:[^\s]*)/g;
    const videoFileRegex = /https?:\/\/[^\s]+?\.(mp4|webm)/g;
    const audioFileRegex = /https?:\/\/[^\s]+?\.mp3/g; 
    if (text == null) { return; }
    const parts = text.split(/(\s+)/g);
    
    return parts.map((part, index) => {
      if (part.match(urlRegex)) {
        return (
          <div key={index} className="tooltip">
            <img
              src={part}
              alt="thumbnail"
              style={{ maxWidth: '100px', margin: '0 5px', borderRadius: '6px' }}
            />
            <span className="tooltiptext">
              <img
                src={part}
                alt="large view"
                style={{ width: '440px', height: 'auto' }}
              />
            </span>
          </div>
        );
      } else if (part.match(youtubeRegex)) {
        const matches = [...part.matchAll(youtubeRegex)];
  
        return matches.map((match, i) => {
          const videoId = match[1];
          
          // Ensure we properly extract the full URL to parse the timestamp
          const fullUrl = match[0];
  
          // Extract timestamp from the URL
          const urlParams = new URLSearchParams(fullUrl.split('?')[1]);
          let startTime = '';
          
          if (urlParams.has('t')) {
            const timeParam = urlParams.get('t');
            const timeInSeconds = timeParam.endsWith('s') 
              ? parseInt(timeParam.slice(0, -1)) 
              : parseInt(timeParam);
            startTime = `&start=${timeInSeconds}`;
          }
          
          const thumbnailUrl = `https://img.youtube.com/vi/${videoId}/0.jpg`;
  
          return (
            <div key={`${index}-${i}`} className="tooltip">
              <img
                src={thumbnailUrl}
                alt="YouTube video preview"
                style={{ maxWidth: '100px', margin: '0 5px', borderRadius: '6px' }}
              />
              <span className="tooltiptext">
                <iframe
                  width="420"
                  height="315"
                  src={`https://www.youtube.com/embed/${videoId}?rel=0${startTime}`}
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  title={`YouTube video preview ${i}`}
                />
              </span>
            </div>
          );
        });
      } else if (part.match(videoFileRegex)) {
        const matches = [...part.matchAll(videoFileRegex)];
  
        return matches.map((match, i) => {
          const videoSrc = match[0];
          const thumbnailUrl = 'https://via.placeholder.com/100/000000/FFFFFF?text=Video';
  
          return (
            <div key={`${index}-${i}`} className="tooltip">
              <img
                src={thumbnailUrl}
                alt="Video file preview"
                style={{ maxWidth: '100px', margin: '0 5px', borderRadius: '6px' }}
              />
              <span className="tooltiptext">
                <video width="420" height="315" controls>
                  <source src={videoSrc} type={`video/${match[1]}`} />
                </video>
              </span>
            </div>
          );
        });
      } else if (part.match(audioFileRegex)) {
        const matches = [...part.matchAll(audioFileRegex)];
    
        return matches.map((match, i) => {
          const audioSrc = match[0];
          const thumbnailUrl = 'https://via.placeholder.com/100/000000/FFFFFF?text=Audio';
    
          return (
            <div key={`${index}-${i}`} className="tooltip">
              <img
                src={thumbnailUrl}
                alt="Audio file preview"
                style={{ maxWidth: '100px', margin: '0 5px', borderRadius: '6px' }}
              />
              <span className="tooltiptext">
                <audio controls style={{ borderRadius: '5px', padding: '4px' }}>
                  <source src={audioSrc} type="audio/mpeg" />
                </audio>
              </span>
            </div>
          );
        });
      }
    });
  };

  return (
    <div>
      <div className="custom-textarea">
        <InputTextarea
          style={{ width: '99%', borderRadius: '5px', marginTop: '5px' }}
          className="p-inputtext-sm"
          placeholder="Text"        
          id="content"
          {...register('content')}
          rows={17}
          onClick={handleCursorPositionChange}
          onKeyUp={handleCursorPositionChange}
        />
        <div className="preview">
          {parseText(text)}
        </div>
      </div>
      <div className="drop-zone" {...getRootProps()} onClick={handleClick}>
        <input {...getInputProps()} ref={fileInputRef} />
        <label><i className="pi pi-upload cloud-upload-icon"></i>&nbsp;upload files...</label>
      </div>
    </div>
  );
};

export default ImageTextarea;
