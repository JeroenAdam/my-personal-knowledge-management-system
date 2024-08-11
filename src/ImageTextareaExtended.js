import React, { useEffect, useState } from 'react';
import { InputTextarea } from 'primereact/inputtextarea';

const ImageTextareaExtended = ({ name, register, setValue, watch, onTextChange, ...props }) => {
  const [text, setText] = useState(() => watch(name) || '');

  useEffect(() => {
    const subscription = watch((value) => {
      if (value[name] !== text) {
        setText(value[name]);
      }
    });
    return () => subscription.unsubscribe();
  }, [name, watch, text]);

  const handleChange = (e) => {
    const newValue = e.target.value;
    // console.log("Extended component - text changed, value: ", newValue)
    setText(newValue);
    onTextChange(newValue);
    setValue(name, newValue);
  };

  const parseText = (text) => {
    const urlRegex = /(https?:\/\/[^\s]+(?:\.png|\.jpg|\.jpeg|\.gif|\.webp))/g;
    const youtubeRegex = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:watch\?v=|shorts\/)|youtu\.be\/)([^\s&]+)(?:[^\s]*)/g;
    const videoFileRegex = /https?:\/\/[^\s]+?\.(mp4|webm)/g;
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
        console.log(matches);
  
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
                  Your browser does not support the video tag.
                </video>
              </span>
            </div>
          );
        });
      }
    });
  };
  

  return (
    <div className="custom-textarea">
      <InputTextarea {...props}
        value={text}
        onChange={handleChange}
        style={{ width: '99%', borderRadius: '5px', marginTop: '5px' }}
        className="p-inputtext-sm"
        placeholder="Text"
        rows={17}
      />
      <div className="preview">
        {parseText(text)}
      </div>
      <input type="hidden" {...register(name)} value={text} />
    </div>
  );
};

export default ImageTextareaExtended;
