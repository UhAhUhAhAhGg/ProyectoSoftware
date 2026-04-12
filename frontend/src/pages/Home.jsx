import { Link } from 'react-router-dom';
import { useState } from 'react';
import { useTheme } from '../context/ThemeContext';
import './Home.css';

function Home() {
  const { darkMode, toggleDarkMode } = useTheme();
  const [menuAbierto, setMenuAbierto] = useState(false);

  const toggleMenu = () => {
    setMenuAbierto(!menuAbierto);
  };

  return (
    <div className="home-container">
      {/* Header con navegación (sin cambios) */}
      <header className="home-header">
        <div className="header-content">
          <div className="logo-container">
            <Link to="/" className="logo">
              <span className="logo-icon">🎫</span>
              <h1>TicketGo</h1>
            </Link>
          </div>

          <nav className={`nav-menu ${menuAbierto ? 'abierto' : ''}`}>
            <button className="nav-close" onClick={toggleMenu}>×</button>
            <ul>
              <li><a href="#inicio" onClick={toggleMenu}>Inicio</a></li>
              <li><a href="#quienes-somos" onClick={toggleMenu}>Quiénes Somos</a></li>
              <li><a href="#como-funciona" onClick={toggleMenu}>Cómo Funciona</a></li>
              <li><a href="#contacto" onClick={toggleMenu}>Contacto</a></li>
            </ul>
          </nav>

          <div className="header-actions">
            <button onClick={toggleDarkMode} className="dark-mode-toggle">
              {darkMode ? '☀️' : '🌙'}
            </button>
            <button className="menu-toggle" onClick={toggleMenu}>
              ☰
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section (sin cambios) */}
      <section id="inicio" className="hero-section">
        <div className="hero-content">
          <h1 className="hero-title">
            ¡Bienvenido a <span className="highlight">TicketGo</span>!
          </h1>
          <p className="hero-subtitle">
            La plataforma más fácil y segura para comprar y vender boletos de eventos
          </p>

          <div className="hero-buttons">
            <Link to="/login" className="btn-primary">
              <span className="btn-icon">🔑</span>
              Iniciar Sesión
            </Link>
            <Link to="/registro" className="btn-secondary">
              <span className="btn-icon">📝</span>
              Crear Cuenta
            </Link>
          </div>

          <div className="hero-stats">
            <div className="stat-item">
              <span className="stat-number">10K+</span>
              <span className="stat-label">Usuarios</span>
            </div>
            <div className="stat-item">
              <span className="stat-number">500+</span>
              <span className="stat-label">Eventos</span>
            </div>
            <div className="stat-item">
              <span className="stat-number">50K+</span>
              <span className="stat-label">Boletos</span>
            </div>
          </div>
        </div>
        <div className="hero-image">
          <img src="https://media.istockphoto.com/id/2194925696/es/vector/boletos-dorados-3d-boleto-dorado-con-estrellas-y-la-inscripci%C3%B3n-admita-uno-ilustraci%C3%B3n.jpg?s=612x612&w=0&k=20&c=5H93HojRupFNC08nacTGtXbDvclWcaVgyLl91s8vzAg=" alt="Eventos" />
        </div>
      </section>

      {/* Quiénes Somos (sin cambios) */}
      <section id="quienes-somos" className="about-section">
        <div className="section-header">
          <h2>¿Quiénes Somos?</h2>
          <div className="section-divider"></div>
        </div>

        <div className="about-content">
          <div className="about-text">
            <p>
              En <strong>TicketGo</strong>, somos apasionados por conectar a las personas
              con experiencias inolvidables. Desde 2024, nos hemos dedicado a crear la
              plataforma más confiable y fácil de usar para la compra y venta de boletos
              para todo tipo de eventos.
            </p>
            <p>
              Nuestra misión es democratizar el acceso al entretenimiento, permitiendo
              que tanto compradores como promotores puedan realizar transacciones de
              manera segura, rápida y transparente.
            </p>

            <div className="mission-vision">
              <div className="mission-card">
                <h3>🎯 Misión</h3>
                <p>
                  Facilitar el acceso a eventos culturales, deportivos y de
                  entretenimiento, creando una comunidad vibrante de amantes de
                  las experiencias únicas.
                </p>
              </div>
              <div className="vision-card">
                <h3>⭐ Visión</h3>
                <p>
                  Ser la plataforma líder en Latinoamérica para la gestión de
                  eventos, reconocida por su innovación, seguridad y experiencia
                  de usuario.
                </p>
              </div>
            </div>
          </div>

          <div className="about-image">
            <img src="data:image/jpeg;base64,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44VXqdUtSNbYypWgLO7HCqPUxETM6hJnUbli9BvZor8d3qqSW6Kzipz/AGXwfsmdsN6+YYVy0n3ZyussARzB6EHImrbauTSnxMmza0U48ZNm2u71746TZykWP3l+MrpqyDYfIt4IPU/IGbsWC+Tx4acmetPzcU3s311W0SRY3d0ZyumrJFfXkW8XPqfkBPUw8emPx5efkzWv5a3OhqEAgED07O2fbqLBVTW9th6KiknHmfIep5TG161jczplWs2nUOnbsdlIHDZrm4j19mqbCj0ewdfgv1mefl5s+Kfq7cfE97/o6VpNJVQi1VIlVa9ERQqj5Dx9ZwzabTue7sisRGoYzbOwdPqrdNdYuX0tveoR+d48Lea8QVsfo+pmymS1YmI92F8dbTEz7MizzBsV8UqEY+sqELesqELGULxQhA4jQnvI0bR3suk2BbGjae9jRtIeQTxQozAYQJAjamEgcSbDrIunl2ztujRUm69uFRyUdXsb6KL4n7vHEypjtedQxveKRuXEt8d8Lto2c/xenQ/iqFPL+s5/Ob7vD19XBgjHH3eblzTkn7Nbm9perQ7SuoOabraTnP4qx6/uMwtStvMMotMeJbJoO0radOP9o71R+bdWlmfi2A32zTbiYp9myue8e737S7WNfdT3SimhzkNdSrhyvkvExCnrz+rEwrwscTvyytybzGmiWWFmLMSzMSzMxJZmPUknqZ1xGvDQWVGxbrbn367VrpP/AAzGk6ktelinucgcSrjLZ4hjoD5zRlz1pXq8s60m06dK1fYrpzUq16m1bwPesdFetz/UGCv6x+c4Y59t947OmeNGu092h7d7NNo6Uk9ydTXnlZpeK3PPllMcY+qdePl47++vzaLYrVeWrcy9NfotDqQarNXwOVThssqqZmGWGcA+4xxk4A+UynkVmk3r7JGOeqIl37Y+79GjqFVFYqUAZKj37CBjidurH1M8W+W153Z6lK1pGqvU1Hr9cx227VNpfWXqFR0x85eo0raiXqNK2pl6k0rNUu00U1S7TRGrPlLs0ThPlLtNPNiZbY6GI2aRiXaaSBGzRgJF0YL6xtdHC+smzQxCmEgcQOZb879kk6bRuVVTizUoSrMwP5NbDoP0h18OXM92Djf+1/0cWbke1WuabfraFeMagsB4WJW+fiSM/bN08bHPs0xyMke7M6TtV1a/l1aewf1bEb6w2PsmqeFSfEtscu/vENT23tm/W2m69y7HIVRyStfoovgP+jkzpx46441DnvebzuWz7k9n9ut4L7806Q+8uP8Ae3j9Efmr+kfkD1HPn5UU/DXvLfh4037z2h0nV7gbNtRU9mFfCoVXqZ0fHmTn3j6tmcEcrLE727J42OY1pqm1Ox88zpdTnyTULj/On8M6KftD+qP0aL8L+mWm7X3G2hpcl9M7oP5ynFyY8zwZKj4gTrpysV/Eua+C9fMNcUZIA5k8gBzJM37aW5bodnGr2gz54dLVU4rta4HvVYqGwKeTZwyn3uEEHkTObNy6Y/u20xTZ2jdXs70Gg4XWvvrxz9ovw7g+aL+SnyGfWeZl5V8nmdQ6K44qSgo+8toHNqdjV1sfos2qL4+plmWv9P8A3/4Y9X4269yJz6Z9Y7uTR1OQbTt/76aUOfdSoVp1PM6S0qP12+2ehWP9LP8Anu0TP7xs++3aBpdl3V6exLbrXUWstXB+KrJIBJYjJODy9PDlOfDxbZY3DdbN09mzaW6u6qu6s8VdtaW1tjHEjqGU/UROa0dM6l0VvuNlesSNsWlWyCNsolUwhkqeXaqWEy2mlLLMok0rbMsTCaV8Jl3CaeDM2MEiDSYEARsOJNgssVBxMyoo6sxCqPmY8+Ce3lg9RvtoEcVm9WJOCyK71r8WAx9WZtjBkmN6apz44nW2f0mprtQWVuliHoyMGU/MTTaJjtLdWYmNwsuuRFLuyoijLOxCqo9SeQkiJmdQs6iNy5Zv9vx3/FpNK2KPybbhkG/zVfJPM+Pw6+jx+Nr8VvLg5HI6vw18Kuz3co6orqtQuNKpyiHl7Qw/5B5+PTzjk8np/DXynH4/X+K3hto3W2RtDvDRwBkIV20r8HATnHuYK4ODzxg4nL6+bFrq/wB3R6OHJ/D/ALNR3g7PTRqdPp6tQje1C3ue+DIeOvhyhKg5JD8jgdDOrHy+qszaPDnycbptERPls+7/AGYV1Uu2oKX6l63VEPF7PS7IQM4wWOT18PAZGZz5ObMz+HtDfj4cRX8XeWY7NdrmzTtobhwavZ/+z2VnkTUvuow88Y4TjyB/OE08qmrdceJbONfcdE+YZDtB2rbpNnXX0crAa6w/Xuw7hSwHnzwPjNfGpW+SIsy5FppjmYeDsk25frNJd7Qxsam4Vraw95lKg4J8SPP1E2c3HXHeOns18XJa9Z2zO/u8C6DQW2D/AH1gNGnXAObWHXHiFGT8gPGauNi9S8R7e658nRVfuLu6ml0WjS2mn2qqslrFrHGjOxYjiOTnmAT5iM+bqvOp7NePH01jfl4d5dW2y9pVbRwfYNaK9JtAgZ7m1eVN5+APCfRcdcTZiiMuOae8d4ar/gtv2lp/aVv1rtJtVfZ9QBpVr099KIFNN9bLkljj3wTxDOfhOvjcelsfeO7Te87bX2bbRr1u2ttaxOa2U7PFZ+ihq5r9aD6pqz1mmOtZ+6Vnc7dO4ZyaZ7QVklduLdvFFmm1ezNpVe7YhNYswDiypxZXnz6ty9J6HCmLVtSWvJ525trtrHa2vos1b10G3udPfqFUhAoPD3jLnAOMZxgcs8p1xT0qT092G+qe76Z0tCVVVVV8q6q0qrHLArVQq/YBPn7WmZmZelSI1qCuZjtuiFLmXbZCpjKy0rZoFTNMoVWTKmlbTJNEzCMRxToaUh40GDyK8O29tVaOo22nl0RB+XY30VH7fCZY8c3nUML3ikblqVDbY1yC6u2vTU25atMhGCeByELfPPrOmfRxzqY3LRHrZI3E6hjNs7o2I+l9q1jW2anUJp1GLLWCk++3Ex8Mjw8RM8eeJiemvaGu+CYmOq3ls1XZvowjKTczEYFhsAKHzAAx9eZonl323xxKaa1r90Nfs9zdpLHsQcy1JK2gDwev84fDPwE315GPJ2vGmi2DJj71Yy3TbU2mQzJfcB+SWApoB6cs8KA/DnNkWw4vDCYy5fu9ek3S9l1uhTXtUKtQ7gorknKj3VfkMAsVGQfPpMbcjrpbo8wyjB0XrF/d1LeTa1Oj0lhdlrzVZXTWMgu/AQqIF6eHoPSebipa9+z0Mt60r3co7Pd569nW3Narsltar+LALBg4PQkcsFvq9Z6fJwTkiNPO4+aMczMt42Jrn2ntWrWrVami0mnsSl7VCiy5yQWX1IPgTgIM4zOLJWMWKab7y68dpy5YvrtDoSGcEu1qO+e5ramxdbpLPZ9emPfDFFuAGAGI6MBgA+I5HzHVg5MUjovG6uXPx5tPVTtLlu8e8G0xZdptXfarcK1XUcSisjhBHup7vMEHI65E9PDiw6i1IedkyZNzFpUbD3j19Qq0ulvdA1qiupAg4rWbkOY55JHXlMsmHFO7XhjTJeO1ZdW3W3Cve9NdtS5tRqEbvKqC5srpbi4uZ6cj0VfdGPGeXm5dYr0Yo1Hy66YJmeq7paTg23yNboK9TTZRcosqtQ12ISRxKfUcwfUdJspaaz1R5aLxExp8r72aVdPrdTpKrLLKNLfbRV3hOVAc8Qx0HvcXMYz1n0OGZtSLT5lwz5dL/BwZ/aNoALmo00F3+jYHbhX5guf7M5uZETEMqu74nDpmVphZYcr/AAhFX/RlBPJhrq+D1/E28X2To4O/Un8kvrT58nrtL6H7JLnOxtNxEkBr1TJLHgFrAD0A5jE+f52ozTp6XFjdG1WWGcrsisKHc+csM9KDYZkulbWSipnmUIQvMkJxmVC8caRjMze1JGJNjE7x7xU6KviY8drD8XSD7znzP0V9fvmzFitkns15ctccMFsLYVustXX6/n0NGmIwqr1GVPRf0ep8fXdky1pHRj/Vqx4rXnrv+jx7W2zdo9Lq9AWYXV2L7PcCEZtG75yMdCMcPLpxYHSZUxxe0X9v+WF8lqVmnv7fkx+5mrv1mt0ddthddGbtQpc8T4IXkSeZ94L16c5nyK1pSZiPLDBa17xEz4daDzzXpmDSKcPIPDtzY9OtpNNy5HVHGA9bfSU+B++ZY8lsc7hhkx1vGpc53x3Pu0+lOos1b6kUmutVdWHd1E8PIlj4leU9DByK2v0xXW3Dn49q16ptvTQ53OJ9Gbt61b9Hprh0emsnHgwXDD5MCPlPns0TW8w97DaLUiWWUzU2HDTGV04b2uH/ALVs5fzNGfX3es9vgfyXjcz+bLFbhkDamgyMj2mv688vtm3lfybfk1Yf5kPpVbhPm3sTRel8ba5xvRVZn/8AI21Wrp8xdpRH+mNo4wB7S45eeBn55zPpOL/Kq82/mX0L2QUUjY2isqRENlX41lUBrLUdkYsR1OQes02pa152bbribPTg2RlnPlwz5hYlwr8I3XObNDpuBxUq2XmwqwrexjwhQ3QlQpOP0xM+HXW5LS45p0VnRWbgRnVWfHFwKTgtjxwOeJ3TMxHZg732d7sbQ2c91OovRtEqnuK04WDWs+S4JHEmAOa9CX9J4PLz4ssRNY7u/j0vWe/hudhnDt31h5mMyhtiFFhmULp53mcSaUNM4ljpWT6zJjohYypJOKVHPKtka/TDvqtR39rHiuosJNdh/RLHr+r+yd85Mdu0xqHnxjyV7xO5Lq9+StZQUOmszwd04JVSfzvM/DEtePud77FuR21rut3c3bbvPbNYTZqGPGqPzFZ8Cw+kPAdF+6Zc0a6aeFx4e/Vfy2/vDOZ0tH7UKcrprfENZUfMggMPuP1zr4k95hycuPEvP2Xacd5qLuXEiJWoycgOSSf8gmXLntEJxI7zLowuM4NO7ZxfJ0r1GGoPlJ0r1SsXUHyk6YXqlrPaVazbNsxgAWUl/VePGPrI+qdHFiIyw5+VMzjcfTGRnPDkcWOuM88T1Z8PLh9C7G01eloSilStSZKhmLHJOSST5kmeDkmb2m1vL3cdYpWKx4ZAamauls2tW+YzDJxftZpYbSLsQRbTU6AA+4oBQg+fNSfnPZ4Ex6Wo9nj82sxl38sd2faU27T0gB4eGzvs44shAXI6+OMZmzl26cNmrjV6stYfQ9bifOS9yYemu0TFqtWXto1AHM8gOZPkIiXNko+TNs672nVanUkY9ovtvwfDjctj7Z9Xjr01iHly+ifwfdX3mxuD+g1d9PyISz/7JjPkdLkBEjjf4R9x9k0Sfmtqnc+eVqIH/wAzOXjTvLZlbw4IykAEggMMqSMZGSMjz5gj5Tvlg+qtJdxU1Nk+9VW3M8+ag858nf8Ain83uYo3WCWPEOiIeayyZxDLSl7JnECh7ZlEMZUtbM9MVbWS6SVTPMmMl45lpGN4ptaVVlCM6WMis9eeByoLJnyPhLuYjSTWJna/imLIcUDVO0TUVHTCsuvei1HVM5fGCDkeAwepnTxonq37OXlTHTr3YLs61JTWFPC2p1I8MrhgfsP1zfyo3TbTxZ1fTpgsnnvRMLJNBhZJpTCyNKxW9una/Q31Ipd2CcKjqSLFP7Jsw2it4mWrPWbY5iHJ9mbJs1GoGmXC2EuDx5AUoCWzgE+Bnp3yRWvVPh5lMc2t0x5dw0xKoik5ZUVWI6EgAEzxp7y9mvaF62THTNYtsx0u3Pe1zTZGlv8AI2UN88Mv3NO/gW1M1cHPr/DZhuyyvO062+hVc/w93h/5pu50/utNPBjeaHbktngzD3NPTXbNcwxmpNsaiz2TVd0C1x09wqUcybTWQoHzxLi16lerxuHLnxz0zp8v2VlSVYYZSVYHqGBwRPrImJjs8R9A/g70XVaXWJbVZXW9lGpoZ0ZVtWyo+8hIwwwqdPOc9s1Orp33XUuuzNCu+Joz564691iNuF/hGaziOzqBzOdRaQOZ/MVf2/VOb9nW6pvZneNaan2nbEGk02x1C4ZdI9FhAAHeAixs+vFbYfmZs4Wb1LZJ+/8An/xsz4uiKux6V8VVDwFaDyOOEeE8O38UvZx1/DBbLJlDdEPNZZM4hVD2zOIYSoeyZxDGVLWTPTFU9syiGMyqNky0x2XvJU28HHNumpPHGgccaHl2ubDp7hUStvdtwEdc+Q8iemfWZU11RthffTOvLS92d3qdXWbrLLCwcrYgwOfXPEck5B++dWXLak6iHJhw1vG5kl2is2XqkvANlGSAwHPgbkVbybHQ+OPiBeqM1Ne6TWcN+r2bzs7a1OoXiqcPjqOjr8VPMTjtjmvl20yVv4l7e8mGmZhZGlSHk0pxZGhzzYlTLtx/S7VO39Rlcgn9ZfrnbkmPQ/RwY4mOR+ro4snBp6JhZJpdnW2Y6XbVu0tOPQg4z3d9bZ58gQy/eROnidsjm5sbx/3YDs/uztPiUBQdL7wXpnu68/5hmb+XH7rU/Ln4c/vu3w6wl88iavYiXpr1E1zVnt6a9RNc1JrEuS79bjWUd/q9MzWUPxvqKzjjqXi7wkfSQED1GB15mezxOZW2qX7T7PG5XDmm7V7w6P2TbbL7J0oL8bU95Q3MEoFsbgU+WEKfLE8z9oUmue0x22z4+KMmOG7Da05oz5YjXVLKeIov2mTMJm1vLZTjRDjG+AOq3m0lZ95a/Zjg9O7Tiuf7OKe1xvwcK0/O/wDpy3pvkxX8v+09uF2V0I/S1J+yr98fsqNdf9v+W39oxqK/3b7pr+GqseVaDn6KJwWru0y9OnasEs1MsUWbPM+omyKMJsoe+ZxVhNlLXTPpYzKtrZlpjtU1sumOyGwzLSbLxy6TbFWbTpX8q2sfGxP3zb0Wn2aZvWPdS23tMOt9fybi+6X07fCerT5VnebSj+eHyVz+yX0b/CevT5L/ACq0n9L/AO3b/DL6F/hPXp8sBsnbVOn1mo4XPstx4w3A3uvjPTGQMlh08vjN18drUj5aKZa1vPxLOvvTo2BBsyCMEGqwgj1HDNHo3+G/18c+7AbS1GjB7/S2tRemSoSuwI5x0wRhc/V5ib6xfxaNw0XnH/FSdSyuzN9KjWO/ylg5HhUlW9R5fCa78eYns205Ndfi8vX/ACx0v0n/AMNph9Pdl9TQfyz0vnZ/hmPp7r9VQNvrpQP5w+gTr9Zj6a59VRr+zN46l11+rsRlFtfAirhiD7g59OoWbrYZ9OKw56Z6xkm8s/8Ay7030bj/AGE/imn6W7o+rp90jf3TfQv/AFK/44+kv9j6ynxI/l/pvoX/AKlf8cn0l/sv1lPiWO3k3wo1OktoRbQ78GC6IFGHVjzDHwEzw8a1LxaWvNyqXpNY2wu5+2KtHqGutV2BqZF7vhJBJB5gkZ6ec38jFOSuoaONlrjt1WbqnaLpfo3/AKifxzhng3+zvjn4/uuTtG0nlcP7tf4phPByfZlHPx/dfX2k6P8A9Yf3Y/fMJ4GT7M4/aGL7m1faNoXqtTNp463Th7rrlSMdZK8DLFolL8/Dasx3c/3R2vVpdZpL2Lola2LqOHJ4yRYFIHiMMgx5qTPR5GK2THavn4eZgyVpkraf7unjtN0H9JZ/gvPI/wDG5vh6n12D/IT/AKytnn+dcfGm390f+OzfDKOdg+f9mkaHeWg7bt11lp7gCxamep2YqU4FChR7vU8yOmc8zPRvx7fTRjiO7hpnp9TOSZ7H7SN49NraqFotLtXY5ZO7sQYK4zlgOmPtk4XHvjmeqPLLm8jHlrHRLZtLvvo2rrJuCMUXiRlfiVscwcDE5rcTJEz2dVeZimsdzne3Rn/iE/zD9kv02T4X6rF/UQ7zaQ/8RV+tiX0L/CfUY/6oId4dKf8AiKv8RZfRv8MfXx/MI/07pv8AzFP+Kn75l6V/iU9an9UAbWoPS6o/3ifvj07fB6lJ94T7dX/SV/4ifvjon4OuvyBqkPR1PwZTL0ydUJ70eY+sRpNuPT1XjiAQCAQCAQCAQCAQCAQCAQCAQCAQCAQCAQCAQCAQCAQCAQCAQCQGJQQCAQCAQCAQCAQCAQCAQCAQCAQCAQCAQCAQCAQCAQCAQCAQCAQCAQCAQCAQCAQCAQCAQCAQCAQCAQCAQCAQCAQCAQCAQCAQCAQCAQCAQCAQCAQCAQCAQCAQCAQCAQCAQCAQCAQCAQCAQCAQCAQCAQCAQCAQCAQCAQCAQCAQCAQCAQCAQCAQCAQCAQCAQCAQCAQCAQCAQCAQCAQCAQCB/9k=" alt="Nuestro equipo" />
          </div>
        </div>
      </section>

      {/* Cómo Funciona (SECCIÓN MODIFICADA CON LA NUEVA IMAGEN) */}
      <section id="como-funciona" className="how-it-works">
        <div className="section-header">
          <h2>¿Cómo Funciona?</h2>
          <div className="section-divider"></div>
        </div>

        <div className="steps-container">
          <div className="step-card">
            <div className="step-number">1</div>
            <div className="step-icon">📝</div>
            <h3>Regístrate</h3>
            <p>Crea tu cuenta gratis eligiendo tu tipo de perfil: Comprador o Promotor</p>
          </div>

          <div className="step-card">
            <div className="step-number">2</div>
            <div className="step-icon">🔍</div>
            <h3>Explora o Crea</h3>
            <p>Compradores: busca eventos. Promotores: publica tus eventos</p>
          </div>

          <div className="step-card">
            <div className="step-number">3</div>
            <div className="step-icon">🎫</div>
            <h3>Compra o Vende</h3>
            <p>Realiza transacciones seguras con nuestra plataforma</p>
          </div>

          <div className="step-card">
            <div className="step-number">4</div>
            <div className="step-icon">🎉</div>
            <h3>Disfruta</h3>
            <p>Asiste a tus eventos favoritos o celebra el éxito de tus ventas</p>
          </div>
        </div>

        {/* 🆕 NUEVA SECCIÓN DE IMAGEN: Banner promocional */}
        <div className="upcoming-banner">
          <img
            src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcToV_1UOTMot0xmtg0nA01GY9zWOXgJmWZ63Q&s"
            alt="Próximos Eventos - Upcoming Events"
            className="upcoming-image"
          />
          <div className="banner-overlay">
            <h3>¿Listo para los próximos eventos?</h3>
            <p>Miles de experiencias te esperan. ¡Encuentra la tuya!</p>
          </div>
        </div>

        <div className="roles-showcase">
          <h3>Dos perfiles, una plataforma</h3>
          <div className="roles-cards">
            <div className="role-card buyer">
              <h4>🛍️ Comprador</h4>
              <ul>
                <li>✓ Explora miles de eventos</li>
                <li>✓ Compra boletos seguros</li>
                <li>✓ Recibe notificaciones</li>
                <li>✓ Guarda tus favoritos</li>
              </ul>
              <Link to="/registro" className="role-link">Regístrate como Comprador →</Link>
            </div>
            <div className="role-card promoter">
              <h4>📢 Promotor</h4>
              <ul>
                <li>✓ Crea eventos ilimitados</li>
                <li>✓ Gestiona ventas en tiempo real</li>
                <li>✓ Analiza estadísticas</li>
                <li>✓ Promociona tus eventos</li>
              </ul>
              <Link to="/registro" className="role-link">Regístrate como Promotor →</Link>
            </div>
          </div>
        </div>
      </section>

      {/* Contacto (sin cambios) */}
      <section id="contacto" className="contact-section">
        <div className="section-header">
          <h2>Contáctanos</h2>
          <div className="section-divider"></div>
        </div>

        <div className="contact-content">
          <div className="contact-info">
            <h3>¿Tienes preguntas?</h3>
            <p>Estamos aquí para ayudarte. Elige el canal que prefieras:</p>

            <div className="contact-methods">
              <div className="contact-method">
                <span className="method-icon">📧</span>
                <div>
                  <h4>Email</h4>
                  <p>soporte@ticketgo.com</p>
                  <p>ventas@ticketgo.com</p>
                </div>
              </div>

              <div className="contact-method">
                <span className="method-icon">📞</span>
                <div>
                  <h4>Teléfono</h4>
                  <p>+54 11 1234-5678</p>
                  <p>Lun-Vie 9:00 - 18:00</p>
                </div>
              </div>

              <div className="contact-method">
                <span className="method-icon">📍</span>
                <div>
                  <h4>Dirección</h4>
                  <p>Av. Corrientes 1234</p>
                  <p>Buenos Aires, Argentina</p>
                </div>
              </div>

              <div className="contact-method">
                <span className="method-icon">💬</span>
                <div>
                  <h4>Redes Sociales</h4>
                  <p>@ticketgo en todas las redes</p>
                </div>
              </div>
            </div>
          </div>

          <div className="contact-image">
            <img src="https://illustrations.popsy.co/amber/customer-support.svg" alt="Contacto" />
          </div>
        </div>
      </section>

      {/* Footer (sin cambios) */}
      <footer className="home-footer">
        <div className="footer-content">
          <div className="footer-section">
            <h4>TicketGo</h4>
            <p>Tu plataforma de confianza para eventos</p>
          </div>

          <div className="footer-section">
            <h4>Enlaces rápidos</h4>
            <ul>
              <li><a href="#inicio">Inicio</a></li>
              <li><a href="#quienes-somos">Quiénes Somos</a></li>
              <li><a href="#como-funciona">Cómo Funciona</a></li>
              <li><a href="#contacto">Contacto</a></li>
            </ul>
          </div>

          <div className="footer-section">
            <h4>Legal</h4>
            <ul>
              <li><a href="#">Términos y Condiciones</a></li>
              <li><a href="#">Política de Privacidad</a></li>
              <li><a href="#">Política de Cookies</a></li>
            </ul>
          </div>

          <div className="footer-section">
            <h4>Síguenos</h4>
            <div className="social-links">
              <a href="#" className="social-link">📘</a>
              <a href="#" className="social-link">📷</a>
              <a href="#" className="social-link">🐦</a>
              <a href="#" className="social-link">💼</a>
            </div>
          </div>
        </div>

        <div className="footer-bottom">
          <p>&copy; 2024 TicketGo. Todos los derechos reservados.</p>
        </div>
      </footer>
    </div>
  );
}

export default Home;