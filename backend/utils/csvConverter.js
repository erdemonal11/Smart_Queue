const convertToCSV = (data) => {
  // Helper function to flatten nested objects
  const flattenObject = (obj, prefix = '') => {
    return Object.keys(obj).reduce((acc, key) => {
      const pre = prefix.length ? prefix + '_' : '';
      if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
        Object.assign(acc, flattenObject(obj[key], pre + key));
      } else {
        acc[pre + key] = obj[key];
      }
      return acc;
    }, {});
  };

  // Convert array of objects to CSV
  const processData = (dataArray) => {
    if (!Array.isArray(dataArray) || !dataArray.length) return '';
    
    // Flatten each object and get all possible headers
    const flattenedData = dataArray.map(item => flattenObject(item));
    const headers = [...new Set(flattenedData.reduce((acc, item) => [...acc, ...Object.keys(item)], []))];
    
    // Create CSV rows
    const rows = [
      headers.join(','), // Header row
      ...flattenedData.map(item => 
        headers.map(header => {
          const value = item[header] ?? '';
          // Handle values that need quotes (contains comma, newline, or quotes)
          return typeof value === 'string' && (value.includes(',') || value.includes('\n') || value.includes('"'))
            ? `"${value.replace(/"/g, '""')}"` 
            : value;
        }).join(',')
      )
    ];
    
    return rows.join('\n');
  };

  // Process each section of the data
  const sections = [];
  
  if (data.profile) {
    sections.push('USER PROFILE');
    sections.push(processData([data.profile]));
  }
  
  if (data.bookings?.length) {
    sections.push('\nBOOKINGS');
    sections.push(processData(data.bookings));
  }
  
  if (data.messages?.length) {
    sections.push('\nMESSAGES');
    sections.push(processData(data.messages));
  }
  
  return sections.join('\n');
};

module.exports = { convertToCSV }; 