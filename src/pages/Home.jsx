import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Container from 'react-bootstrap/Container'
import Row from 'react-bootstrap/Row'
import Col from 'react-bootstrap/Col'
import Card from 'react-bootstrap/Card'
import Button from 'react-bootstrap/Button'
import Alert from 'react-bootstrap/Alert'

// Home demonstrates react-bootstrap layout + components and a bit of state.
function Home() {
  const [count, setCount] = useState(0)
  const navigate = useNavigate() // programmatic (imperative) navigation

  return (
    <Container className="py-5">
      <Alert variant="success">
        ✅ Bootstrap, react-bootstrap, and react-router are all wired up.
      </Alert>

      <h1 className="mb-4">Welcome to PaceBuilder</h1>

      <Row className="g-4">
        <Col md={6}>
          <Card>
            <Card.Body>
              <Card.Title>react-bootstrap components</Card.Title>
              <Card.Text>
                This card, the button, and the navbar are all rendered by
                react-bootstrap and styled by Bootstrap 5.
              </Card.Text>
              <Button variant="primary" onClick={() => setCount((c) => c + 1)}>
                Clicked {count} time{count === 1 ? '' : 's'}
              </Button>
            </Card.Body>
          </Card>
        </Col>

        <Col md={6}>
          <Card>
            <Card.Body>
              <Card.Title>Declarative routing</Card.Title>
              <Card.Text>
                Use the navbar links to move between pages, or navigate
                imperatively with the button below.
              </Card.Text>
              <Button variant="outline-secondary" onClick={() => navigate('/about')}>
                Go to About →
              </Button>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  )
}

export default Home
