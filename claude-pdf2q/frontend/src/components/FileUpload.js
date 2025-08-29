import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import {
  Box,
  Typography,
  Button,
  LinearProgress,
  Alert,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemIcon
} from '@mui/material';
import {
  CloudUpload,
  PictureAsPdf,
  CheckCircle,
  Error
} from '@mui/icons-material';
import { uploadAPI } from '../services/api';

const FileUpload = ({ onUploadComplete }) => {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [error, setError] = useState(null);

  const onDrop = useCallback(async (acceptedFiles) => {
    const file = acceptedFiles[0];
    if (!file) return;

    setUploading(true);
    setError(null);
    setUploadProgress(0);

    try {
      const result = await uploadAPI.uploadPDF(file);
      
      setUploadedFiles(prev => [...prev, {
        name: file.name,
        size: file.size,
        status: 'uploaded',
        textbook_id: result.textbook_id
      }]);
      
      setUploadProgress(100);
      
      if (onUploadComplete) {
        onUploadComplete(result);
      }
      
    } catch (err) {
      setError(err.response?.data?.detail || 'Upload failed');
      setUploadedFiles(prev => [...prev, {
        name: file.name,
        size: file.size,
        status: 'error'
      }]);
    } finally {
      setUploading(false);
    }
  }, [onUploadComplete]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf']
    },
    multiple: false,
    disabled: uploading
  });

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <Box>
      <Paper
        {...getRootProps()}
        sx={{
          p: 4,
          textAlign: 'center',
          cursor: uploading ? 'default' : 'pointer',
          border: '2px dashed',
          borderColor: isDragActive ? 'primary.main' : 'grey.300',
          backgroundColor: isDragActive ? 'action.hover' : 'background.paper',
          '&:hover': {
            borderColor: 'primary.main',
            backgroundColor: 'action.hover',
          },
        }}
      >
        <input {...getInputProps()} />
        
        <CloudUpload 
          sx={{ 
            fontSize: 64, 
            color: isDragActive ? 'primary.main' : 'grey.400',
            mb: 2 
          }} 
        />
        
        {uploading ? (
          <>
            <Typography variant="h6" gutterBottom>
              Uploading...
            </Typography>
            <LinearProgress 
              variant="determinate" 
              value={uploadProgress} 
              sx={{ mt: 2, mb: 2 }}
            />
            <Typography variant="body2" color="textSecondary">
              Please wait while your file is being uploaded and processed
            </Typography>
          </>
        ) : (
          <>
            <Typography variant="h6" gutterBottom>
              {isDragActive ? 'Drop your PDF here' : 'Upload PDF Textbook'}
            </Typography>
            <Typography variant="body1" color="textSecondary" gutterBottom>
              Drag and drop a PDF file here, or click to browse
            </Typography>
            <Typography variant="body2" color="textSecondary" gutterBottom>
              Only PDF files are supported
            </Typography>
            <Button
              variant="contained"
              sx={{ mt: 2 }}
              disabled={uploading}
            >
              Browse Files
            </Button>
          </>
        )}
      </Paper>

      {error && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {error}
        </Alert>
      )}

      {uploadedFiles.length > 0 && (
        <Paper sx={{ mt: 3 }}>
          <Typography variant="h6" sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
            Upload History
          </Typography>
          <List>
            {uploadedFiles.map((file, index) => (
              <ListItem key={index}>
                <ListItemIcon>
                  {file.status === 'uploaded' ? (
                    <CheckCircle color="success" />
                  ) : file.status === 'error' ? (
                    <Error color="error" />
                  ) : (
                    <PictureAsPdf />
                  )}
                </ListItemIcon>
                <ListItemText
                  primary={file.name}
                  secondary={`${formatFileSize(file.size)} • ${
                    file.status === 'uploaded' ? 'Upload successful' : 
                    file.status === 'error' ? 'Upload failed' : 'Uploading...'
                  }`}
                />
              </ListItem>
            ))}
          </List>
        </Paper>
      )}
    </Box>
  );
};

export default FileUpload;