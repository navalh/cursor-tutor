import React, { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  LinearProgress,
  Alert
} from '@mui/material';
import {
  ArrowBack,
  Quiz,
  MenuBook,
  BarChart,
  TrendingUp
} from '@mui/icons-material';
import { questionsAPI } from '../services/api';

const StatisticsPage = () => {
  const { textbookId } = useParams();
  const [statistics, setStatistics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadStatistics();
  }, [textbookId]);

  const loadStatistics = async () => {
    try {
      setLoading(true);
      const data = await questionsAPI.getStatistics(textbookId);
      setStatistics(data);
    } catch (err) {
      setError('Failed to load statistics');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mt: 4 }}>
        <Typography variant="h6" gutterBottom>
          Loading statistics...
        </Typography>
        <LinearProgress sx={{ width: '100%', maxWidth: 400 }} />
      </Box>
    );
  }

  if (error) {
    return (
      <Box>
        <Button
          component={Link}
          to="/"
          startIcon={<ArrowBack />}
          sx={{ mb: 3 }}
        >
          Back to Home
        </Button>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  const { textbook, statistics: stats } = statistics;

  const getQuestionTypeColor = (type) => {
    const colors = {
      'multiple_choice': 'primary',
      'short_answer': 'secondary',
      'essay': 'success',
      'true_false': 'warning'
    };
    return colors[type] || 'default';
  };

  const getQuestionTypeLabel = (type) => {
    const labels = {
      'multiple_choice': 'Multiple Choice',
      'short_answer': 'Short Answer',
      'essay': 'Essay',
      'true_false': 'True/False'
    };
    return labels[type] || type.replace('_', ' ').toUpperCase();
  };

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
          Textbook Statistics
        </Typography>
      </Box>

      {/* Textbook Info */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h5" gutterBottom>
            {textbook.title}
          </Typography>
          <Typography variant="body1" color="textSecondary" gutterBottom>
            {textbook.filename}
          </Typography>
          <Typography variant="body2" color="textSecondary">
            Total Pages: {textbook.total_pages}
          </Typography>
        </CardContent>
      </Card>

      {/* Overview Stats */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Quiz sx={{ fontSize: 48, color: 'primary.main', mb: 1 }} />
              <Typography variant="h4" component="div" color="primary.main">
                {stats.total_questions}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Total Questions
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <MenuBook sx={{ fontSize: 48, color: 'secondary.main', mb: 1 }} />
              <Typography variant="h4" component="div" color="secondary.main">
                {stats.total_chapters}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Chapters
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <TrendingUp sx={{ fontSize: 48, color: 'success.main', mb: 1 }} />
              <Typography variant="h4" component="div" color="success.main">
                {stats.total_questions > 0 ? Math.round(stats.total_questions / stats.total_chapters) : 0}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Avg Questions/Chapter
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <BarChart sx={{ fontSize: 48, color: 'warning.main', mb: 1 }} />
              <Typography variant="h4" component="div" color="warning.main">
                {stats.question_types.length}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Question Types
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Question Types Breakdown */}
      {stats.question_types.length > 0 && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Question Types Distribution
            </Typography>
            
            <Grid container spacing={2}>
              {stats.question_types.map((type) => (
                <Grid item xs={12} sm={6} md={4} key={type.type}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Chip
                      label={getQuestionTypeLabel(type.type)}
                      color={getQuestionTypeColor(type.type)}
                      sx={{ minWidth: 120 }}
                    />
                    <Box sx={{ flexGrow: 1 }}>
                      <LinearProgress
                        variant="determinate"
                        value={(type.count / stats.total_questions) * 100}
                        sx={{ height: 8, borderRadius: 1 }}
                      />
                    </Box>
                    <Typography variant="body2" color="textSecondary">
                      {type.count} ({Math.round((type.count / stats.total_questions) * 100)}%)
                    </Typography>
                  </Box>
                </Grid>
              ))}
            </Grid>
          </CardContent>
        </Card>
      )}

      {/* Chapters Table */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Questions by Chapter
          </Typography>
          
          <TableContainer component={Paper} variant="outlined">
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Chapter</TableCell>
                  <TableCell>Title</TableCell>
                  <TableCell align="right">Questions</TableCell>
                  <TableCell align="right">Percentage</TableCell>
                  <TableCell align="center">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {stats.chapters.map((chapter) => (
                  <TableRow key={chapter.id}>
                    <TableCell>
                      <Typography variant="body2">
                        {chapter.chapter_number}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {chapter.title}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" color={chapter.question_count > 0 ? 'text.primary' : 'text.secondary'}>
                        {chapter.question_count}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 1 }}>
                        <LinearProgress
                          variant="determinate"
                          value={stats.total_questions > 0 ? (chapter.question_count / stats.total_questions) * 100 : 0}
                          sx={{ width: 60, height: 6 }}
                        />
                        <Typography variant="body2" color="textSecondary">
                          {stats.total_questions > 0 ? Math.round((chapter.question_count / stats.total_questions) * 100) : 0}%
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell align="center">
                      {chapter.question_count > 0 ? (
                        <Button
                          size="small"
                          component={Link}
                          to="/practice"
                          state={{ textbookId: parseInt(textbookId), chapterId: chapter.id }}
                        >
                          Practice
                        </Button>
                      ) : (
                        <Typography variant="body2" color="textSecondary">
                          No questions
                        </Typography>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <Box sx={{ display: 'flex', gap: 2, mt: 3, justifyContent: 'center' }}>
        <Button
          variant="contained"
          component={Link}
          to="/practice"
          state={{ textbookId: parseInt(textbookId) }}
          startIcon={<Quiz />}
        >
          Start Practice
        </Button>
        <Button
          variant="outlined"
          onClick={loadStatistics}
        >
          Refresh Statistics
        </Button>
      </Box>
    </Box>
  );
};

export default StatisticsPage;