import React from 'react';
import Layout from '../components/Layout';

// Higher-order component to wrap pages with the Layout component
function withLayout(Component) {
  return function WrappedComponent(props) {
    // Extract search-related props if they exist
    const { showSearch, searchQuery, setSearchQuery, handleSearch, handleClearSearch, ...rest } = props;
    
    return (
      <Layout
        showSearch={showSearch}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        handleSearch={handleSearch}
        handleClearSearch={handleClearSearch}
      >
        <Component {...rest} />
      </Layout>
    );
  };
}

export default withLayout; 