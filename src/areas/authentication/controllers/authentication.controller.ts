import { Router, Request, Response } from 'express';
import Controller from '../../../interfaces/controller.interface';
import { IAuthentication } from '../services/Iauthentication.service';
import { ISession } from '../../../ISession';

class AuthenticationController implements Controller {
  public path = '/'; 
  public router = Router();
  public service: IAuthentication;

  constructor(service: IAuthentication) {
    this.initializeRoutes();
    this.service = service;
  }

  private initializeRoutes(): void {
    this.router.get(`${this.path}home`, this.getHomePage);
    this.router.get(`${this.path}signup`, this.getRegisterPage);
    this.router.get(`${this.path}login`, this.getLoginPage);
    this.router.get(`${this.path}prelog`, this.getPrelogPage);
    this.router.get(`${this.path}join_meeting`, this.getJoinMeetingPage);
    this.router.post(`${this.path}login`, this.login);
    this.router.post(`${this.path}signup`, this.register);
    this.router.post(`${this.path}getUserSession`, this.getUserSession);
    this.router.post(`${this.path}searchUser`, this.searchUser)
  }

  private getHomePage = async (req: Request, res: Response): Promise<void> => {
    console.log("hit getHompage");
    // @ts-ignore
    if(req.session.user?.userId !== undefined) {
    // @ts-ignore
    const userId = req.session.user.userId;
    console.log(`userId: ${userId}`);
    //console.log(req.session);
    //@ts-ignore
    const loggedInUser = await this.service.getUserById(userId);
    console.log(`loged In : `);
    console.log(loggedInUser);
    res.status(200).render('homepage', { loggedInUser })
    } else {
      res.status(200).redirect('/login')
    }
  }
  
  private getRegisterPage(req: Request, res: Response): void {
    res.status(200).render('signup')
  }

  private getLoginPage(req: Request, res: Response): void {
    res.status(200).render("login");
  }

  private getPrelogPage(req: Request, res: Response): void {
    res.status(200).render('prelog')
  }

  private getJoinMeetingPage(req: Request, res: Response): void {
    res.status(200).render("join_meeting");
  }

  private login = async (req: Request, res: Response) => {
    try {
      const {email, password} = req.body;

      const user = await this.service.getUserByEmailAndPwd(email, password);

      const sessionUser = {
        // @ts-ignore
        userId: user.userId,
        // @ts-ignore
        userEmail: user.email,
        // @ts-ignore
        username: user.username,
      }
      //@ts-ignore
      req.session.user = sessionUser;

      res.status(200).redirect("/home");
    }
    catch (err) {
      if (err) {
        console.log(err);
        res.status(500).render('login', { err });
      }
    }
  }

  private register = (req: Request, res: Response) => {
    try {
      const { username, email, password } = req.body;
      
      const newUser = this.service.insertUser(username, email, password);

      const sessionUser = {
        // @ts-ignore
        userId: newUser.userId,
        // @ts-ignore
        userEmail: newUser.email,
        // @ts-ignore
        username: newUser.username,
      }
      //@ts-ignore
      req.session.user = sessionUser;
      
      res.status(200).render('homepage', { newUser });
    }
    catch(err) {
      res.status(500).render('signup', { err });
    }
  }

  private getUserSession = async (req: Request, res: Response) => {
    // @ts-ignore
    const user = JSON.stringify(req.session.user);
    console.log('at router: ', user)
    if (user) {
      res.status(200).json({
        data: user,
      })
    } else {
      res.status(404).json({
        error: "User not found.",
      })
    }
  }

  private searchUser = async (req: Request, res: Response) => {
    const { username } = req.body;
    const users = await this.service.getUserByUsername(username);
    if (users !== undefined) {
      res.status(200).json({
        data: users,
      })
    } else {
      res.status(200).json({
        data: "user not found",
      })
    }
  }
}

export default AuthenticationController;
