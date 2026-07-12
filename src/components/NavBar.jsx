import Container from 'react-bootstrap/Container'
import Navbar from 'react-bootstrap/Navbar'
import Nav from 'react-bootstrap/Nav'
import { NavLink } from 'react-router-dom'

import { usePlansModal } from './PlansModalContext.jsx'

// react-bootstrap Navbar wired to react-router via `as={NavLink}`.
// NavLink automatically applies an "active" class to the matching route,
// so the current page is highlighted for free.
function NavBar() {
  const plansModal = usePlansModal()

  return (
    <Navbar expand="md" sticky="top" className="pb-navbar">
      <Container>
        <Navbar.Brand as={NavLink} to="/">
          🏃 PaceBuilder
        </Navbar.Brand>
        <Navbar.Toggle aria-controls="main-nav" />
        <Navbar.Collapse id="main-nav">
          <Nav className="ms-auto">
            {/* `end` makes "/" match only the exact root, not every route. */}
            <Nav.Link as={NavLink} to="/" end>
              Home
            </Nav.Link>
            {/* The plan list is a modal, not a route. */}
            <Nav.Link onClick={plansModal.open}>My Plans</Nav.Link>
          </Nav>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  )
}

export default NavBar
