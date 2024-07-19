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
    console.log("Extended component - text changed, value: ", newValue)
    setText(newValue);
    onTextChange(newValue);
    setValue(name, newValue);
  };

  const parseText = (text) => {
    const urlRegex = /(https?:\/\/[^\s]+(\.png))/g;
    const parts = text.split(urlRegex);

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
