import { Link } from 'react-router-dom'
import Container from 'react-bootstrap/Container'
import Card from 'react-bootstrap/Card'
import ListGroup from 'react-bootstrap/ListGroup'
import Button from 'react-bootstrap/Button'
import Badge from 'react-bootstrap/Badge'

// About lists the stack so it's obvious every library is loaded and working.
function About() {
  const stack = [
    ['React', 'UI library (function components + hooks)'],
    ['Vite', 'Dev server & build tool — outputs a static SPA'],
    ['Bootstrap', 'CSS framework / theme'],
    ['react-bootstrap', 'Bootstrap components as React components'],
    ['react-router-dom', 'Client-side routing (declarative)'],
  ]

  return (
    <Container className="py-5">
      <h1 className="mb-4">
        About <Badge bg="secondary">v0.0.0</Badge>
      </h1>

      <Card>
        <Card.Header>Tech stack</Card.Header>
        <ListGroup variant="flush">
          {stack.map(([name, desc]) => (
            <ListGroup.Item key={name}>
              <strong>{name}</strong> — {desc}
            </ListGroup.Item>
          ))}
        </ListGroup>
      </Card>

      <div className="mt-4">
        <Button as={Link} to="/" variant="primary">
          ← Back home
        </Button>
      </div>
    </Container>
  )
}

export default About
