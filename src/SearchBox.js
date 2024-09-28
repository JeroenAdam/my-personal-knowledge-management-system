import React, { useState, useCallback } from 'react';
import { InputText } from 'primereact/inputtext';
import { IconField } from 'primereact/iconfield';
import { InputIcon } from 'primereact/inputicon';

const SearchBox = ({ elasticsearchUrl, elasticsearchApiKey, query, setQuery, setFilteredNotes }) => {

  const debounce = (func, delay) => {
    let timer;
    return function (...args) {
      clearTimeout(timer);
      timer = setTimeout(() => func.apply(this, args), delay);
    };
  };

  const searchNotes = async (searchQuery) => {
    let searchBody;
  
    if (!searchQuery) {
      // If the search query is empty, fetch all notes
      searchBody = {
        aggs: {},
        size: 200,
        _source: { includes: ["id", "title", "content", "tagLabels", "linkLabels", "status"] },
        query: {
            bool: {
              must_not: {
                match: { status: "DELETED" }  // Exclude notes with status 'DELETED'
              }
            }
          },
        from: 0,
        sort: [ { "id": { "order": "asc" } } ]
      };
    } else {
      // When there is a search query, use the multi_match query logic
      searchBody = {
        aggs: {},
        size: 50,
        _source: { includes: ["id", "title", "content", "tagLabels", "linkLabels", "status"] },
        query: {
          bool: {
            must_not: [
                { match: { status: "DELETED" } }  // Exclude notes with status 'DELETED'
            ],
            should: [
              { multi_match: { query: searchQuery, fields: ["title^3", "content^1", "tagLabels^1"], type: "best_fields", operator: "and" } },
              { multi_match: { query: searchQuery, fields: ["title^3", "content^1", "tagLabels^1"], type: "cross_fields" } },
              { multi_match: { query: searchQuery, fields: ["title^3", "content^1", "tagLabels^1"], type: "phrase" } },
              { multi_match: { query: searchQuery, fields: ["title^3", "content^1", "tagLabels^1"], type: "phrase_prefix" } }
            ]
          }
        },
        highlight: {
            type: "plain",  // Use plain highlighter
            pre_tags: ["<mark>"],
            post_tags: ["</mark>"],
            fields: {
              "content": { 
                fragment_size: 0,  // Set fragment size to 0 to return full content
                number_of_fragments: 0 // Set number of fragments to 0 to prevent splitting
              },
              "title": {},
              "tagLabels": {}
            }
          },
        from: 0,
        sort: [{ _score: "desc" }]
      };
    }
  
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `ApiKey `+ elasticsearchApiKey,
    };
    try {
      const response = await fetch(elasticsearchUrl + '/notes/_search', {
        method: 'POST',
        headers,
        body: JSON.stringify(searchBody),
      });
      const data = await response.json();
      const hits = data.hits.hits.map(hit => {
        const source = hit._source;
                // If there's a highlighted 'tagLabels', merge it into the source
                if (hit.highlight && hit.highlight.tagLabels) {
                    source.tagLabels = hit.highlight.tagLabels;  // You can also join this if needed
                }
        if (Array.isArray(source.tagLabels) && source.tagLabels.length > 0) { // Check if array and not empty
          source.tags = source.tagLabels.map(label => ({ label })); // Map to label prop
        } else {
          source.tags = []; // Set an empty array if no tagLabels exist
        }
        // If there's a highlighted 'title', merge it into the source
        if (hit.highlight && hit.highlight.title) {
            source.title = hit.highlight.title.join(' ');  // Join highlighted titles if there are multiple
        }
        // If there's a highlighted 'content', merge it into the source
        if (hit.highlight && hit.highlight.content) {
            source.content = hit.highlight.content.join(' ');  // Join highlighted content if there are multiple
        }
        // If there's a highlighted 'tagLabels', merge it into the source
        if (hit.highlight && hit.highlight.tagLabels) {
            source.tagLabels = hit.highlight.tagLabels;  // You can also join this if needed
        }
        // Optionally remove the highlight attribute if no longer needed
        delete hit.highlight;
        delete source.tagLabels; // delete 'tagLabels' if no longer needed
        return source;
      });
      setFilteredNotes(hits);
    } catch (error) {
      console.error('Error fetching notes:', error);
    }
  };
  

  const handleSearch = useCallback(debounce(searchNotes, 100), []);

  const handleInputChange = (e) => {
    setQuery(e.target.value);
    if (e.target.value.length >= 3 || e.target.value.length == 0 ) { handleSearch(e.target.value); }
  };

  return (
    <div>
        <IconField iconPosition="left">
            <InputIcon className="pi pi-search" />
            <InputText type="search" value={query} onChange={handleInputChange} placeholder="Search..." className="searchlabel show-cancel-button" />
        </IconField>

    </div>
  );
};

export default SearchBox;