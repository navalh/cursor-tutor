import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  Chip,
  Paper,
  Divider,
  CircularProgress
} from '@mui/material';
import {
  ArrowBack,
  Quiz,
  Refresh,
  MenuBook,
  QuestionMark
} from '@mui/icons-material';
import { uploadAPI, questionsAPI } from '../services/api';

const PracticePage = () => {
  const location = useLocation();
  const [textbooks, setTextbooks] = useState([]);
  const [selectedTextbook, setSelectedTextbook] = useState(location.state?.textbookId || '');
  const [chapters, setChapters] = useState([]);
  const [selectedChapter, setSelectedChapter] = useState('');
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [questionHistory, setQuestionHistory] = useState([]);

  useEffect(() => {
    loadTextbooks();
  }, []);

  useEffect(() => {
    if (selectedTextbook) {
      loadChapters(selectedTextbook);
    } else {
      setChapters([]);
      setSelectedChapter('');
    }
  }, [selectedTextbook]);

  const loadTextbooks = async () => {
    try {
      const data = await uploadAPI.getTextbooks();
      const completedTextbooks = data.filter(book => book.status === 'completed');
      setTextbooks(completedTextbooks);
      
      // If no textbook is selected, select the first completed one
      if (!selectedTextbook && completedTextbooks.length > 0) {
        setSelectedTextbook(completedTextbooks[0].id);
      }
    } catch (err) {
      setError('Failed to load textbooks');
    }
  };

  const loadChapters = async (textbookId) => {
    try {
      const data = await questionsAPI.getChapters(textbookId);
      setChapters(data);
    } catch (err) {
      setError('Failed to load chapters');
    }
  };

  const loadRandomQuestion = async () => {
    if (!selectedTextbook) {
      setError('Please select a textbook');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const filters = {
        textbook_id: selectedTextbook,
        ...(selectedChapter && { chapter_id: selectedChapter })
      };

      const question = await questionsAPI.getRandomQuestion(filters);
      setCurrentQuestion(question);
      
      // Add to history (keep last 10)
      setQuestionHistory(prev => [question, ...prev.slice(0, 9)]);
      
    } catch (err) {
      if (err.response?.status === 404) {
        setError('No questions found. Try selecting a different chapter or textbook.');
      } else {
        setError('Failed to load question');
      }
    } finally {
      setLoading(false);
    }
  };

  const selectedTextbookData = textbooks.find(t => t.id === selectedTextbook);
  const selectedChapterData = chapters.find(c => c.id === selectedChapter);

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <Button
          component={Link}
          to="/"
          startIcon={<ArrowBack />}
          sx={{ mr: 2 }}
        >
          Back to Home
        </Button>
        <Typography variant="h4" component="h1">
          Practice Questions
        </Typography>
      </Box>

      {/* Selection Controls */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Select Study Material
        </Typography>
        
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
          <FormControl sx={{ minWidth: 200 }}>
            <InputLabel>Textbook</InputLabel>
            <Select
              value={selectedTextbook}
              onChange={(e) => setSelectedTextbook(e.target.value)}
              label="Textbook"
            >
              {textbooks.map((textbook) => (
                <MenuItem key={textbook.id} value={textbook.id}>
                  {textbook.title}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl sx={{ minWidth: 200 }} disabled={!chapters.length}>
            <InputLabel>Chapter (Optional)</InputLabel>
            <Select
              value={selectedChapter}
              onChange={(e) => setSelectedChapter(e.target.value)}
              label="Chapter (Optional)"
            >
              <MenuItem value="">
                <em>All Chapters</em>
              </MenuItem>
              {chapters.map((chapter) => (
                <MenuItem key={chapter.id} value={chapter.id}>
                  Chapter {chapter.chapter_number}: {chapter.title}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <Button
            variant="contained"
            onClick={loadRandomQuestion}
            disabled={!selectedTextbook || loading}
            startIcon={loading ? <CircularProgress size={20} /> : <Quiz />}
          >
            Get Random Question
          </Button>
        </Box>

        {/* Selection Info */}
        {selectedTextbookData && (
          <Box sx={{ mt: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <Chip
              icon={<MenuBook />}
              label={`${selectedTextbookData.title} (${selectedTextbookData.chapters_count} chapters)`}
              variant="outlined"
            />
            {selectedChapterData && (
              <Chip
                icon={<QuestionMark />}
                label={`${selectedChapterData.question_count} questions available`}
                color="primary"
                variant="outlined"
              />
            )}
          </Box>
        )}
      </Paper>

      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* No Textbooks Available */}
      {textbooks.length === 0 && (
        <Alert severity="info" sx={{ mb: 3 }}>
          No processed textbooks available. 
          <Button component={Link} to="/upload" sx={{ ml: 1 }}>
            Upload a textbook
          </Button>
        </Alert>
      )}

      {/* Current Question */}
      {currentQuestion && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'between', alignItems: 'flex-start', mb: 2 }}>
              <Typography variant="h6" gutterBottom>
                Question
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                <Chip
                  label={currentQuestion.question_type.replace('_', ' ').toUpperCase()}
                  size="small"
                  color="primary"
                />
                <Chip
                  label={`Page ${currentQuestion.page_number}`}
                  size="small"
                  variant="outlined"
                />
                {currentQuestion.chapter && (
                  <Chip
                    label={`Ch. ${currentQuestion.chapter.chapter_number}: ${currentQuestion.chapter.title}`}
                    size="small"
                    variant="outlined"
                  />
                )}
              </Box>
            </Box>
            
            <Typography variant="body1" sx={{ mb: 3, fontSize: '1.1rem', lineHeight: 1.6 }}>
              {currentQuestion.question_text}
            </Typography>

            {currentQuestion.context && (
              <Box sx={{ mt: 3 }}>
                <Divider sx={{ mb: 2 }} />
                <Typography variant="subtitle2" color="textSecondary" gutterBottom>
                  Context:
                </Typography>
                <Typography variant="body2" color="textSecondary" sx={{ fontStyle: 'italic' }}>
                  {currentQuestion.context}
                </Typography>
              </Box>
            )}

            {currentQuestion.answer && (
              <Box sx={{ mt: 3 }}>
                <Divider sx={{ mb: 2 }} />
                <Typography variant="subtitle2" color="success.main" gutterBottom>
                  Answer:
                </Typography>
                <Typography variant="body2" color="success.dark">
                  {currentQuestion.answer}
                </Typography>
              </Box>
            )}

            <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
              <Button
                variant="contained"
                onClick={loadRandomQuestion}
                startIcon={<Refresh />}
                disabled={loading}
              >
                Next Question
              </Button>
            </Box>
          </CardContent>
        </Card>
      )}

      {/* Question History */}
      {questionHistory.length > 1 && (
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Previous Questions
          </Typography>
          
          {questionHistory.slice(1).map((question, index) => (
            <Box key={question.id} sx={{ mb: 2, pb: 2, borderBottom: index < questionHistory.length - 2 ? 1 : 0, borderColor: 'divider' }}>
              <Typography variant="body2" color="textSecondary" gutterBottom>
                {question.chapter?.title || 'Unknown Chapter'} • Page {question.page_number}
              </Typography>
              <Typography variant="body1">
                {question.question_text}
              </Typography>
            </Box>
          ))}
        </Paper>
      )}

      {/* Instructions */}
      {!currentQuestion && !loading && textbooks.length > 0 && (
        <Paper sx={{ p: 3, textAlign: 'center' }}>
          <Quiz sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" gutterBottom>
            Ready to Practice?
          </Typography>
          <Typography variant="body1" color="textSecondary" gutterBottom>
            Select a textbook and optionally a specific chapter, then click "Get Random Question" to start practicing.
          </Typography>
        </Paper>
      )}
    </Box>
  );
};

export default PracticePage;