import React from 'react';
import { Button } from 'primereact/button';
import { ToggleButton } from 'primereact/togglebutton';

const CustomNavbar = ({ selectedTag, scrollToTop, clearFilter, setDisplayDeleted, displayDeleted }) => {
  if (selectedTag !== "Home" || (displayDeleted && selectedTag !== "Home") ) {
    return null;
  }

  return (
    <div className="custom-navbar">
      <Button rounded icon="pi pi-undo" className="custom-navbar-item" label="Go back" onClick={() => { clearFilter();setDisplayDeleted(false); }}>
      </Button>
      <Button rounded icon="pi pi-box" className="custom-navbar-item" label="Archive" onClick={() => setDisplayDeleted(false)}>
      </Button>
      <Button rounded icon="pi pi-cog" className="custom-navbar-item" label="Settings" onClick={scrollToTop}>
      </Button>
      <Button rounded style={{ borderColor: 'red'}} icon="pi pi-trash" severity="danger" className="custom-navbar-item"
              disabled={displayDeleted} label="Recycle bin" onClick={() => setDisplayDeleted(prevState => !prevState)}></Button>
    </div>
  );
};

export default CustomNavbar;        
