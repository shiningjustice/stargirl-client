import React from 'react';
import AuthApiService from '../services/auth-api-service';
import TokenService from '../services/token-service';
import IdleService from '../services/idle-service';

const UserContext = React.createContext({
  user: {},
  error: null, 
  setError: () => {},
  clearError: () => {},
  setUser: () => {},
  processLogin: () => {},
  processLogout: () => {},
})

export default UserContext;

export class UserProvider extends React.Component {
  constructor(props) {
    super(props)
    const state = { 
      user: {}, 
      error: null
    };

    const jwtPayload = TokenService.parseAuthToken();
    
    if (jwtPayload)
      state.user = {
        id: jwtPayload.id,
        username: jwtPayload.sub,
      }
      
    this.state = state;
    IdleService.setIdleCallback(this.logoutBecauseIdle);
  }

  componentDidMount() {
    if (TokenService.hasAuthToken()) {
      IdleService.regiserIdleTimerResets();
      TokenService.queueCallbackBeforeExpiry(() => {
        this.fetchRefreshToken()
      });
    }
  };

  componentWillUnmount() {
    IdleService.unRegisterIdleResets();
    TokenService.clearCallbackBeforeExpiry();
  }
  
  setError = error => {
    console.error(error);
    this.setState({ error })
  }

  clearError = () => {
    this.setState({ error: null });
  }

  setUser = user => {
    this.setState( { user })
  }

  // saves auth token and sets user in context's state. 
  // starts timeout for IdleService logout
  processLogin = authToken => {
    TokenService.saveAuthToken(authToken);
    const jwtPayload = TokenService.parseAuthToken();
    this.setUser({
      id: jwtPayload.id,
      username: jwtPayload.sub,
    })
    IdleService.regiserIdleTimerResets();
    TokenService.queueCallbackBeforeExpiry(() => {
      this.fetchRefreshToken()
    });
  }

  processLogout = () => {
    TokenService.clearAuthToken();
    TokenService.clearCallbackBeforeExpiry();
    IdleService.unRegisterIdleResets();
    this.setUser({})
  }

  logoutBecauseIdle = () => {
    TokenService.clearAuthToken();
    TokenService.clearAuthToken();
    TokenService.clearCallbackBeforeExpiry();
    IdleService.unRegisterIdleResets();
    this.setUser({ idle: true })
  }

  fetchRefreshToken = () => {
    AuthApiService.refreshToken()
      .then(res => {
        TokenService.saveAuthToken(res.authToken);
        TokenService.queueCallbackBeforeExpiry(() => {
          this.fetchRefreshToken()
        })
      })
      .catch(err => {
        this.setError(err);
      })
  }

  render() {
    const value = {
      user: this.state.user,
      error: this.state.error,
      setError: this.setError,
      clearError: this.clearError, 
      setUser: this.setUser,
      processLogin: this.processLogin,
      processLogout: this.processLogout,
    }

    return (
      <UserContext.Provider value={value}>
        {this.props.children}
      </UserContext.Provider>
    )
  }
}